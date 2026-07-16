import { notFound } from "next/navigation";
import DomainSkillExplorer from "../../components/DomainSkillExplorer";
import { getDomain } from "../../lib/robotics-data";
import { getAllRobotSkills } from "../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: domainKey } = await params;
  const domain = getDomain(domainKey);
  if (!domain) {
    notFound();
  }
  const allSkills = await getAllRobotSkills();
  return (
    <DomainSkillExplorer
      domain={domain}
      skills={allSkills.filter((skill) => skill.domain === domainKey)}
      skillReferences={Object.fromEntries(
        allSkills.map((skill) => [
          skill.skill_id,
          { domain: skill.domain, label: skill.preferred_label_ko },
        ]),
      )}
    />
  );
}
