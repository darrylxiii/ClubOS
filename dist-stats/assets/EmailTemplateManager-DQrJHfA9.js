import{j as e}from"./vendor-query-BZyYGKCt.js";import{r as l}from"./vendor-react-CuFUCoS-.js";import{C as v,a as b,b as y,d as _,c as O}from"./card-DX1jaBX_.js";import{T as q,a as A,b as B,c as I}from"./tabs-B2naBo5f.js";import{B as c,c as J,E as R,a as u,L as H,q as D}from"./App-DsBphtVX.js";import{s as C}from"./index-T2VZWyPA.js";import{I as T}from"./input-sZAHcWyy.js";import{L as j}from"./label-Caf09wxe.js";import{T as Q}from"./textarea-7AVMUwyd.js";import{S as V}from"./switch-BLM7s0pH.js";import{u as E}from"./vendor-i18n-2KcO6nFR.js";import{M as G}from"./monitor-Bpy4mk4b.js";import{S as U}from"./smartphone-D7tSk8r-.js";import{D as $,b as F,c as M,d as P,e as L,f as Y}from"./dialog-CGxCEfdI.js";import{A as K}from"./arrow-left-ClU7PYzw.js";import{S as z}from"./send-B_zLLSW1.js";import{S as W}from"./save-DwcVCmk5.js";import{M as X}from"./mail-djVFU5-Z.js";import{P as Z}from"./pen-Bxmk6sUv.js";import"./vendor-radix-ByFWfQNo.js";import"./vendor-supabase-6U_Eb7vz.js";import"./vendor-charts-BgEcMk5-.js";import"./vendor-helmet-DSYpcAfj.js";import"./vendor-motion-RQVNHGFp.js";import"./x-DvVU6jpR.js";const ee="https://os.thequantumclub.com/email-header.gif",k="#C9A24E";function se({template:i,contentOverride:p}){const{t}=E("common"),[r,o]=l.useState("desktop");let n;try{n=p?JSON.parse(p):i.content_template}catch{n=i.content_template}const m=()=>{const h=(n.candidateNextSteps||n.partnerNextSteps||[]).map(g=>`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px;">
        <tr><td style="font-size: 14px; color: #555555; line-height: 1.6;">• ${g}</td></tr>
      </table>
    `).join("");return`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #0E0E10;
              background: #f5f5f5;
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 0 0 16px 16px;
              overflow: hidden;
              box-shadow: 0 4px 24px rgba(0,0,0,0.10);
            }
            .header-img {
              display: block;
              width: 100%;
              max-width: 600px;
              border: 0;
              line-height: 0;
              font-size: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .button {
              display: inline-block;
              background: ${k};
              color: #0E0E10;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              margin-top: 20px;
            }
            .card {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
              border: 2px solid ${k};
            }
            .card-default {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
              border: 1px solid #e5e7eb;
            }
            .footer {
              padding: 24px 30px;
              background: #fafafa;
              border-top: 1px solid #f0f0f0;
              text-align: center;
              font-size: 12px;
              color: #aaaaaa;
            }
            a { color: ${k}; }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="padding: 0; margin: 0; line-height: 0; font-size: 0;">
              <img
                src="${ee}"
                alt={t("the_quantum_club", "The Quantum Club")}
                width="600"
                class="header-img"
                onerror="this.style.display='none';"
              />
            </div>
            <div class="content">
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 600; color: #0E0E10;">
                ${n.heading||i.name}
              </h1>
              <p style="color: #555555; margin: 0 0 24px 0;">
                ${n.intro||"Email content goes here"}
              </p>

              ${h?`
                <div class="card">
                  <p style="margin: 0 0 12px 0; font-weight: 600; color: ${k};">{t("whats_next", "✨ What's Next")}</p>
                  ${h}
                </div>
              `:""}

              ${n.ctaText?`
                <div style="text-align: center; margin-top: 28px;">
                  <a href="${n.ctaUrl||"#"}" class="button">
                    ${n.ctaText}
                  </a>
                </div>
              `:""}

              ${n.showReason?`
                <div class="card-default" style="margin-top: 24px;">
                  <p style="margin: 0; color: #555555;"><strong>{t("reason", "Reason:")}</strong>{t("sample_feedback_would_appear", "Sample feedback would appear here")}</p>
                </div>
              `:""}

              <p style="margin-top: 32px; color: #555555;">
                Best regards,<br><strong>{t("the_quantum_club_team", "The Quantum Club Team")}</strong>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0 0 8px 0; font-weight: 500; color: #555555;">{t("the_quantum_club", "The Quantum Club")}</p>
              <p style="margin: 0 0 8px 0;">
                <a href="#">{t("email_preferences", "Email Preferences")}</a> &nbsp;•&nbsp;
                <a href="#">{t("support", "Support")}</a> &nbsp;•&nbsp;
                <a href="#">{t("privacy", "Privacy")}</a>
              </p>
              <p style="margin: 0; font-size: 11px;">© ${new Date().getFullYear()} The Quantum Club. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `};return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx(c,{size:"sm",variant:r==="desktop"?"default":"outline",onClick:()=>o("desktop"),children:e.jsx(G,{className:"h-4 w-4"})}),e.jsx(c,{size:"sm",variant:r==="mobile"?"default":"outline",onClick:()=>o("mobile"),children:e.jsx(U,{className:"h-4 w-4"})})]}),e.jsx("span",{className:"text-xs text-muted-foreground",children:t("light_theme_preview","Light theme preview")})]}),e.jsx("div",{className:J("border rounded-lg overflow-hidden transition-all",r==="mobile"?"max-w-[375px] mx-auto":"w-full"),children:e.jsx("iframe",{srcDoc:m(),className:"w-full",style:{height:"600px"},title:t("email_preview","Email Preview")})})]})}function te({template:i,onClose:p}){const{t}=E("common"),[r,o]=l.useState({name:i.name,description:i.description||"",subject_template:i.subject_template,content_template:JSON.stringify(i.content_template,null,2),is_enabled:i.is_enabled}),[n,m]=l.useState(!1),[f,h]=l.useState(!1),[g,d]=l.useState(!1),[x,w]=l.useState(""),S=async()=>{m(!0);try{let s;try{s=JSON.parse(r.content_template)}catch{u.error(t("invalid_json_in_content","Invalid JSON in content template")),m(!1);return}const{error:N}=await C.from("email_templates").update({name:r.name,description:r.description,subject_template:r.subject_template,content_template:s,is_enabled:r.is_enabled}).eq("id",i.id);if(N)throw N;u.success(t("template_updated_successfully","Template updated successfully")),p()}catch(s){console.error("Error saving template:",s),u.error(t("failed_to_save_template","Failed to save template"))}finally{m(!1)}},a=async()=>{if(!x){u.error(t("please_enter_a_test","Please enter a test email address"));return}try{const{error:s}=await C.functions.invoke("send-test-email",{body:{templateKey:i.template_key,testEmail:x}});if(s)throw s;u.success(`Test email sent to ${x}`),d(!1),w("")}catch(s){console.error("Error sending test email:",s),u.error(t("failed_to_send_test","Failed to send test email"))}};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"container mx-auto py-8",children:[e.jsxs("div",{className:"mb-6 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs(c,{variant:"ghost",onClick:p,children:[e.jsx(K,{className:"h-4 w-4 mr-2"}),"Back"]}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold",children:t("edit_template","Edit Template")}),e.jsx("p",{className:"text-muted-foreground",children:i.template_key})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(c,{variant:"outline",onClick:()=>h(!0),children:[e.jsx(R,{className:"h-4 w-4 mr-2"}),"Preview"]}),e.jsxs(c,{variant:"outline",onClick:()=>d(!0),children:[e.jsx(z,{className:"h-4 w-4 mr-2"}),"Send Test"]}),e.jsxs(c,{onClick:S,disabled:n,children:[e.jsx(W,{className:"h-4 w-4 mr-2"}),n?"Saving...":"Save Changes"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"lg:col-span-2 space-y-6",children:[e.jsxs(v,{children:[e.jsx(b,{children:e.jsx(y,{children:t("template_details","Template Details")})}),e.jsxs(_,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(j,{htmlFor:"name",children:t("name","Name")}),e.jsx(T,{id:"name",value:r.name,onChange:s=>o({...r,name:s.target.value})})]}),e.jsxs("div",{children:[e.jsx(j,{htmlFor:"description",children:t("description","Description")}),e.jsx(T,{id:"description",value:r.description,onChange:s=>o({...r,description:s.target.value})})]}),e.jsxs("div",{children:[e.jsx(j,{htmlFor:"subject",children:t("subject_template","Subject Template")}),e.jsx(T,{id:"subject",value:r.subject_template,onChange:s=>o({...r,subject_template:s.target.value})})]}),e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsx(V,{id:"enabled",checked:r.is_enabled,onCheckedChange:s=>o({...r,is_enabled:s})}),e.jsx(j,{htmlFor:"enabled",children:t("template_enabled","Template Enabled")})]})]})]}),e.jsxs(v,{children:[e.jsx(b,{children:e.jsx(y,{children:t("content_template_json","Content Template (JSON)")})}),e.jsx(_,{children:e.jsx(Q,{value:r.content_template,onChange:s=>o({...r,content_template:s.target.value}),className:"font-mono text-sm min-h-[400px]",placeholder:'{"heading": "...", "intro": "..."}'})})]})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsxs(v,{children:[e.jsx(b,{children:e.jsx(y,{children:t("variables","Variables")})}),e.jsx(_,{children:e.jsx("div",{className:"space-y-2",children:i.variables&&Object.entries(i.variables).map(([s,N])=>e.jsxs("div",{className:"text-sm",children:[e.jsx("code",{className:"bg-muted px-2 py-1 rounded",children:`{${s}}`}),e.jsx("p",{className:"text-muted-foreground mt-1",children:N})]},s))})})]}),e.jsxs(v,{children:[e.jsx(b,{children:e.jsx(y,{children:t("metadata","Metadata")})}),e.jsxs(_,{className:"space-y-2 text-sm",children:[e.jsxs("div",{children:[e.jsx("strong",{children:t("category","Category:")})," ",i.category]}),e.jsxs("div",{children:[e.jsx("strong",{children:t("edge_function","Edge Function:")})," ",i.edge_function]}),e.jsxs("div",{children:[e.jsx("strong",{children:t("last_modified","Last Modified:")})," ",new Date(i.last_modified_at).toLocaleString()]})]})]})]})]})]}),e.jsx($,{open:f,onOpenChange:h,children:e.jsxs(F,{className:"max-w-4xl max-h-[80vh]",children:[e.jsxs(M,{children:[e.jsx(P,{children:t("email_preview","Email Preview")}),e.jsx(L,{children:"Preview how this email will look to recipients"})]}),e.jsx(se,{template:i,contentOverride:r.content_template})]})}),e.jsx($,{open:g,onOpenChange:d,children:e.jsxs(F,{children:[e.jsxs(M,{children:[e.jsx(P,{children:t("send_test_email","Send Test Email")}),e.jsx(L,{children:"Enter an email address to receive a test version of this template"})]}),e.jsx("div",{className:"space-y-4 py-4",children:e.jsxs("div",{children:[e.jsx(j,{htmlFor:"testEmail",children:t("email_address","Email Address")}),e.jsx(T,{id:"testEmail",type:"email",placeholder:t("testexamplecom","test@example.com"),value:x,onChange:s=>w(s.target.value)})]})}),e.jsxs(Y,{children:[e.jsx(c,{variant:"outline",onClick:()=>d(!1),children:"Cancel"}),e.jsxs(c,{onClick:a,children:[e.jsx(z,{className:"h-4 w-4 mr-2"}),"Send Test"]})]})]})})]})}function Ee(){const{t:i}=E("admin"),[p,t]=l.useState([]),[r,o]=l.useState(!0),[n,m]=l.useState(null),[f,h]=l.useState("member_requests");l.useEffect(()=>{g()},[]);const g=async()=>{try{const{data:a,error:s}=await C.from("email_templates").select("*").order("category",{ascending:!0}).order("name",{ascending:!0});if(s)throw s;t(a||[])}catch(a){console.error("Error fetching templates:",a),u.error("Failed to load email templates")}finally{o(!1)}},d=p.reduce((a,s)=>(a[s.category]||(a[s.category]=[]),a[s.category].push(s),a),{}),x=[{key:"member_requests",label:"Member Requests"},{key:"bookings",label:"Bookings"},{key:"notifications",label:"Notifications"},{key:"system",label:"System"}],w=a=>{m(a)},S=()=>{m(null),g()};return n?e.jsx(te,{template:n,onClose:S}):e.jsx("div",{className:"space-y-6",children:r?e.jsx("div",{className:"flex items-center justify-center py-12",children:e.jsx(H,{className:"h-8 w-8 animate-spin text-primary"})}):e.jsxs(q,{value:f,onValueChange:h,children:[e.jsx(A,{children:x.map(a=>e.jsxs(B,{value:a.key,children:[a.label,e.jsx(D,{variant:"secondary",className:"ml-2",children:d[a.key]?.length||0})]},a.key))}),x.map(a=>e.jsxs(I,{value:a.key,className:"space-y-4",children:[e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",children:d[a.key]?.map(s=>e.jsxs(v,{children:[e.jsxs(b,{children:[e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsx(X,{className:"h-5 w-5 text-muted-foreground"}),e.jsx(D,{variant:s.is_enabled?"default":"secondary",children:s.is_enabled?"Active":"Disabled"})]}),e.jsx(y,{className:"text-lg mt-2",children:s.name}),e.jsx(O,{children:s.description})]}),e.jsx(_,{children:e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"text-sm text-muted-foreground",children:[e.jsx("strong",{children:i("emailTemplateManager.text1")})," ",s.subject_template]}),e.jsxs("div",{className:"text-sm text-muted-foreground",children:[e.jsx("strong",{children:i("emailTemplateManager.text2")})," ",s.edge_function]}),e.jsx("div",{className:"flex gap-2 mt-4",children:e.jsxs(c,{size:"sm",className:"flex-1",onClick:()=>w(s),children:[e.jsx(Z,{className:"h-4 w-4 mr-2"}),"Edit"]})})]})})]},s.id))}),(!d[a.key]||d[a.key].length===0)&&e.jsx("div",{className:"text-center py-12 text-muted-foreground",children:"No email templates found in this category"})]},a.key))]})})}export{Ee as default};
