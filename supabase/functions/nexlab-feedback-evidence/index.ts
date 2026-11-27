function accountExpired(profile:any):boolean{return Boolean(profile?.is_test_account)&&(!profile.temporary_until||!Number.isFinite(Date.parse(profile.temporary_until))||Date.parse(profile.temporary_until)<=Date.now());}
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const json=(body:unknown,status=200,origin="*")=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","access-control-allow-origin":origin,"access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS","vary":"Origin"}});
const env=(k:string)=>Deno.env.get(k)?.trim()||"";
const allowedTypes=new Set(["image/png","image/jpeg","image/webp"]);
const maxFiles=3,maxOriginal=5*1024*1024,maxProcessed=Math.floor(1.5*1024*1024);
const origins=()=>env("NEXLAB_ALLOWED_ORIGINS").split(",").map(v=>v.trim()).filter(Boolean);
const originFor=(req:Request)=>{const o=req.headers.get("origin")||"";const list=origins();return list.includes(o)?o:(list[0]||"*");};
const configured=()=>Boolean(env("NEXLAB_R2_ACCOUNT_ID")&&env("NEXLAB_R2_ACCESS_KEY_ID")&&env("NEXLAB_R2_SECRET_ACCESS_KEY")&&env("NEXLAB_R2_BUCKET_NAME")&&env("NEXLAB_ALLOWED_ORIGINS"));
const s3=()=>new S3Client({region:"auto",endpoint:`https://${env("NEXLAB_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,credentials:{accessKeyId:env("NEXLAB_R2_ACCESS_KEY_ID"),secretAccessKey:env("NEXLAB_R2_SECRET_ACCESS_KEY")}});
const adminClient=()=>createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});
const fail=(message:string,code:string,status:number,origin:string)=>json({ok:false,message,code},status,origin);

Deno.serve(async(req:Request)=>{
 const origin=originFor(req);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS","access-control-max-age":"86400","vary":"Origin"}});
 if(req.method!=="POST")return fail("Método não permitido.","method_not_allowed",405,origin);
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return fail("Sessão inválida.","unauthorized",401,origin);
 const db=adminClient();
 const {data:{user},error:userError}=await db.auth.getUser(auth.slice(7));
 if(userError||!user)return fail("Sessão inválida.","unauthorized",401,origin);
 const {data:profile}=await db.from("profiles").select("role,ativo,is_test_account,temporary_until").eq("id",user.id).maybeSingle();
 if(profile?.ativo!==true||accountExpired(profile))return fail("Perfil sem acesso.","profile_inactive",403,origin);
 let body:any={};try{body=await req.json();}catch{return fail("Requisição inválida.","invalid_json",400,origin);}
 const action=String(body.action||"");
 if(action==="status")return json({ok:true,configured:configured(),provider:"cloudflare_r2",max_files:maxFiles,max_original_bytes:maxOriginal,max_processed_bytes:maxProcessed,required_upload_headers:["Content-Type"]},200,origin);
 if(!configured())return fail("Armazenamento externo ainda não configurado.","external_storage_not_configured",503,origin);
 const isAdmin=profile.role==="admin";
 const bucket=env("NEXLAB_R2_BUCKET_NAME");
 try{
  if(action==="reserve_upload"){
   const feedbackId=String(body.feedback_id||"");const mime=String(body.mime_type||"");const size=Number(body.size_bytes||0);const original=Number(body.original_size_bytes||0);const hash=String(body.sha256||"").toLowerCase();
   if(!feedbackId||!allowedTypes.has(mime)||size<1||size>maxProcessed||original<1||original>maxOriginal||!/^[a-f0-9]{64}$/.test(hash))return fail("Dados da imagem inválidos.","invalid_attachment",400,origin);
   const {data:feedback}=await db.from("feedback").select("id,user_id").eq("id",feedbackId).maybeSingle();
   if(!feedback||feedback.user_id!==user.id)return fail("Feedback não localizado.","feedback_not_found",404,origin);
   const {count}=await db.from("nexlab_feedback_attachments").select("id",{count:"exact",head:true}).eq("feedback_id",feedbackId).in("status",["pending","available"]);
   if((count||0)>=maxFiles)return fail("Limite de três imagens atingido.","attachment_limit",409,origin);
   const id=crypto.randomUUID();const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";const key=`feedback/${new Date().getUTCFullYear()}/${feedbackId}/${id}.${ext}`;const expires=new Date(Date.now()+5*60*1000).toISOString();
   const {error}=await db.from("nexlab_feedback_attachments").insert({id,feedback_id:feedbackId,uploader_id:user.id,provider:"cloudflare_r2",object_key:key,display_name:String(body.display_name||"Evidência visual").slice(0,120),mime_type:mime,original_size_bytes:original,size_bytes:size,width:Number(body.width||0)||null,height:Number(body.height||0)||null,sha256:hash,status:"pending",upload_expires_at:expires,retention_until:new Date(Date.now()+180*86400000).toISOString()});
   if(error)throw error;
   const uploadUrl=await getSignedUrl(s3(),new PutObjectCommand({Bucket:bucket,Key:key,ContentType:mime}),{expiresIn:300});
   await db.from("nexlab_feedback_attachment_events").insert({attachment_id:id,feedback_id:feedbackId,actor_id:user.id,event_type:"reserved",details:{size_bytes:size,mime_type:mime}});
   return json({ok:true,attachment_id:id,upload_url:uploadUrl,upload_headers:{"Content-Type":mime},expires_at:expires},200,origin);
  }
  const attachmentId=String(body.attachment_id||"");
  if(!attachmentId)return fail("Anexo inválido.","invalid_attachment",400,origin);
  const {data:item}=await db.from("nexlab_feedback_attachments").select("*").eq("id",attachmentId).maybeSingle();
  if(!item)return fail("Anexo não localizado.","attachment_not_found",404,origin);
  const owner=item.uploader_id===user.id;
  if(action==="complete_upload"){
   if(!owner||item.status!=="pending")return fail("Operação não autorizada.","forbidden",403,origin);
   const head=await s3().send(new HeadObjectCommand({Bucket:bucket,Key:item.object_key}));
   if(Number(head.ContentLength||0)!==Number(item.size_bytes)||String(head.ContentType||"")!==String(item.mime_type))return fail("A imagem recebida não corresponde à reserva.","upload_mismatch",409,origin);
   await db.from("nexlab_feedback_attachments").update({status:"available",available_at:new Date().toISOString(),upload_expires_at:null}).eq("id",attachmentId);
   await db.from("nexlab_feedback_attachment_events").insert({attachment_id:attachmentId,feedback_id:item.feedback_id,actor_id:user.id,event_type:"completed",details:{etag:head.ETag||null}});
   return json({ok:true,attachment_id:attachmentId,status:"available"},200,origin);
  }
  if(action==="cancel_upload"){
   if(!owner||item.status!=="pending")return fail("Operação não autorizada.","forbidden",403,origin);
   try{await s3().send(new DeleteObjectCommand({Bucket:bucket,Key:item.object_key}));}catch{}
   await db.from("nexlab_feedback_attachments").update({status:"cancelled",deleted_at:new Date().toISOString(),deleted_by:user.id}).eq("id",attachmentId);
   await db.from("nexlab_feedback_attachment_events").insert({attachment_id:attachmentId,feedback_id:item.feedback_id,actor_id:user.id,event_type:"cancelled",details:{reason:String(body.reason||"").slice(0,100)}});
   return json({ok:true},200,origin);
  }
  if(!isAdmin)return fail("Ação exclusiva de Administradores.","admin_required",403,origin);
  if(action==="open"){
   if(item.status!=="available")return fail("Evidência indisponível.","attachment_unavailable",409,origin);
   const mode=String(body.mode||"open");const disposition=mode==="download"?`attachment; filename="${String(item.display_name||"evidencia").replace(/[\"\r\n]/g,"")}"`:"inline";
   const url=await getSignedUrl(s3(),new GetObjectCommand({Bucket:bucket,Key:item.object_key,ResponseContentType:item.mime_type,ResponseContentDisposition:disposition}),{expiresIn:300});
   await db.from("nexlab_feedback_attachment_events").insert({attachment_id:attachmentId,feedback_id:item.feedback_id,actor_id:user.id,event_type:mode==="download"?"downloaded":"opened",details:{ttl_seconds:300}});
   return json({ok:true,url,expires_in:300},200,origin);
  }
  if(action==="delete"){
   await s3().send(new DeleteObjectCommand({Bucket:bucket,Key:item.object_key}));
   await db.from("nexlab_feedback_attachments").update({status:"deleted",deleted_at:new Date().toISOString(),deleted_by:user.id}).eq("id",attachmentId);
   await db.from("nexlab_feedback_attachment_events").insert({attachment_id:attachmentId,feedback_id:item.feedback_id,actor_id:user.id,event_type:"deleted",details:{permanent:true}});
   return json({ok:true},200,origin);
  }
  return fail("Ação inválida.","invalid_action",400,origin);
 }catch(error){console.error("feedback-evidence",action,error);return fail("Não foi possível concluir a operação externa.","external_operation_failed",500,origin);}
});

