import EmployeeCompetencyDashboard from "../components/EmployeeCompetencyDashboard";
import { getEmployeeCompetencyDataset } from "../lib/server-data";
import styles from "./page.module.css";

export default async function CompetenciesPage() {
  const dataset = await getEmployeeCompetencyDataset();

  return (
    <main className={styles.pageShell}>
      <header className={styles.pageHeading}>
        <p className={styles.eyebrow}>JOB COMPETENCY ASSESSMENT</p>
        <h1>개인별 역량정보</h1>
        <p>
          {dataset.assessment.year}년 직무역량평가 결과를 4개 전문영역 기준으로
          재구성했습니다.
        </p>
      </header>
      <EmployeeCompetencyDashboard dataset={dataset} />
    </main>
  );
}
