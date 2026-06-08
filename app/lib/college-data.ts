import collegeMapping from "../../public/data/college-mapping.json";
import type { CollegeMappingData } from "./college-types";

export const COLLEGE_MAPPING_DATA = collegeMapping as CollegeMappingData;
export const COLLEGES = COLLEGE_MAPPING_DATA.colleges;
export const LEVELS = COLLEGE_MAPPING_DATA.levels;
export const COLLEGE_DOMAIN_MAPPING = COLLEGE_MAPPING_DATA.domainMapping;
