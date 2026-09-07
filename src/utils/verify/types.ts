export interface VerifyCheck {
  id: string;
  run: string;
  description?: string;
}

export interface VerifyManifest {
  $schema?: string;
  checks: VerifyCheck[];
}

export interface CheckResult {
  id: string;
  run: string;
  exit: number;
  duration_ms: number;
  output_sha256?: string;
  summary?: string;
}

export interface VerifyEvidenceBlock {
  verified_at: string;
  brain_hash: string;
  wake_token?: string;
  checks: CheckResult[];
  waiver?: string;
}
