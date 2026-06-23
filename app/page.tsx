import SkillExplorer from "./components/SkillExplorer";
import { computeRobotStatistics } from "./lib/robotics-data";
import { getAllRobotSkills } from "./lib/server-data";

export default async function RobotSmartFactoryPage() {
  const skills = await getAllRobotSkills();
  return (
    <SkillExplorer skills={skills} stats={computeRobotStatistics(skills)} />
  );
}
