import{a as u,b as o,u as l}from"./vendor-query-BZyYGKCt.js";import{s as a}from"./index-T2VZWyPA.js";import{a as i}from"./App-DsBphtVX.js";function c(e){const r=u();return o({mutationFn:async t=>{if(!e)throw new Error("Company ID required");const{data:n,error:s}=await a.functions.invoke("generate-partner-insights",{body:{companyId:e,insightType:t}});if(s)throw s;return n},onSuccess:()=>{i.success("Insights generated successfully"),r.invalidateQueries({queryKey:["partner-analytics",e]}),r.invalidateQueries({queryKey:["smart-alerts",e]}),r.invalidateQueries({queryKey:["daily-briefing",e]})},onError:t=>{i.error("Failed to generate insights",{description:t.message})}})}function m(e){return l({queryKey:["strategist-assignment",e],queryFn:async()=>{if(!e)return null;const{data:r,error:t}=await a.from("company_strategist_assignments").select(`
          *,
          strategist:profiles!company_strategist_assignments_strategist_id_fkey(
            id,
            full_name,
            avatar_url,
            email
          )
        `).eq("company_id",e).eq("is_active",!0).maybeSingle();if(t&&t.code!=="PGRST116")throw t;return r},enabled:!!e})}export{m as a,c as u};
