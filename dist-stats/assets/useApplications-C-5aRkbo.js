import{u as q}from"./vendor-query-BZyYGKCt.js";import{s as n}from"./index-T2VZWyPA.js";async function h(t){const{data:s}=await n.from("candidate_profiles").select("id").eq("user_id",t).maybeSingle(),r=s?.id,d=r?`user_id.eq.${t},candidate_id.eq.${r}`:`user_id.eq.${t}`,{data:c,error:_}=await n.from("applications").select(`
      *,
      jobs!applications_job_id_fkey (
        id,
        title,
        location,
        salary_min,
        salary_max,
        currency,
        pipeline_stages,
        company_id,
        companies!jobs_company_id_fkey (
          name,
          logo_url
        )
      )
    `).or(d).order("applied_at",{ascending:!1});if(_)throw _;const u=[...new Set(c?.map(i=>i.jobs?.company_id).filter(Boolean))],{data:m}=await n.from("company_members").select("company_id, user_id, role, is_active, created_at").in("company_id",u).eq("is_active",!0).in("role",["recruiter","admin"]),f=[...new Set(m?.map(i=>i.user_id)||[])],{data:y}=await n.from("profiles").select("id, full_name, avatar_url").in("id",f),b=c?.map(i=>i.job_id)||[],{data:j}=await n.from("applications").select("job_id, user_id").in("job_id",b),w=(j||[]).reduce((i,a)=>(a.user_id!==t&&(i[a.job_id]=(i[a.job_id]||0)+1),i),{});return(c||[]).map(i=>{let a=null;if(i.jobs?.company_id){const e=m?.filter(o=>o.company_id===i.jobs.company_id).sort((o,l)=>new Date(o.created_at).getTime()-new Date(l.created_at).getTime())[0];if(e){const o=y?.find(l=>l.id===e.user_id);o&&(a={id:o.id,full_name:o.full_name||"",avatar_url:o.avatar_url||"",user_id:e.user_id})}}const p=i.jobs?.pipeline_stages||[],v=Array.isArray(p)?p.map(e=>({id:e.id||String(e.order),title:e.name,description:e.description,status:"upcoming",preparation:e.resources?{title:"Preparation Guide",content:e.description||"",resources:e.resources}:void 0,scheduledDate:e.scheduled_date,duration:e.duration,location:e.location,meetingType:e.format,interviewers:e.owner?[{name:e.owner,title:e.owner_role||"Interviewer",photo:e.owner_avatar}]:void 0})):[];return{...i,job:i.jobs,stages:v,other_candidates_count:w[i.job_id]||0,talent_strategist:a}})}function T(t,s=!1){return q({queryKey:["applications",t,s],queryFn:async()=>{const r=await h(t);return s?r:r.filter(d=>d.status!=="rejected")},staleTime:6e4,gcTime:3e5,enabled:!!t})}export{T as u};
