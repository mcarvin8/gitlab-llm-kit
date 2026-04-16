/** Minimal GitLab API shapes used by labflow-ai (extend as needed). */

export type GitlabUserRef = {
  id: number;
  username?: string;
  name?: string;
};

export type GitlabLabel = {
  id?: number;
  name: string;
  color?: string;
  description?: string;
};

export type MergeRequest = {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: string;
  author?: GitlabUserRef;
  assignees?: GitlabUserRef[];
  labels?: string[] | GitlabLabel[];
  web_url?: string;
  source_branch?: string;
  target_branch?: string;
  created_at?: string;
  updated_at?: string;
  draft?: boolean;
  merge_when_pipeline_succeeds?: boolean;
};

export type Note = {
  id: number;
  body: string;
  author?: GitlabUserRef;
  created_at?: string;
  updated_at?: string;
  system?: boolean;
  resolvable?: boolean;
  resolved?: boolean;
  position?: {
    new_path?: string;
    old_path?: string;
  };
};

export type MergeRequestChange = {
  old_path: string | null;
  new_path: string | null;
  a_mode?: string;
  b_mode?: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
  diff: string;
};

export type MergeRequestChanges = {
  changes: MergeRequestChange[];
};

export type Commit = {
  id: string;
  short_id?: string;
  title?: string;
  message: string;
  authored_date?: string;
  author_name?: string;
};

export type Issue = {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: string;
  labels?: string[] | GitlabLabel[];
  assignees?: GitlabUserRef[];
  author?: GitlabUserRef;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
  web_url?: string;
};

export type Epic = {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state?: string;
  labels?: string[] | GitlabLabel[];
  web_url?: string;
};

export type RepositoryCompare = {
  commit?: Commit;
  commits?: Commit[];
  diffs?: Array<{
    old_path: string | null;
    new_path: string | null;
    a_mode?: string;
    b_mode?: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
    diff: string;
  }>;
};

export type Release = {
  name: string;
  tag_name: string;
  description?: string | null;
  created_at?: string;
  released_at?: string | null;
  author?: GitlabUserRef;
  milestones?: Array<{ title: string }>;
  assets?: unknown;
};

export type WikiPage = {
  format?: string;
  slug: string;
  title: string;
  content?: string;
  front_matter?: Record<string, unknown>;
};

export type Snippet = {
  id: number;
  title: string;
  description?: string | null;
  visibility?: string;
  web_url?: string;
};

export type Project = {
  id: number;
  description?: string | null;
  name?: string;
  path_with_namespace?: string;
  readme_url?: string | null;
  topics?: string[];
  star_count?: number;
  forks_count?: number;
  default_branch?: string;
  web_url?: string;
};

export type Blob = {
  file_name: string;
  file_path: string;
  size: number;
  encoding?: string;
  content: string;
  ref: string;
  blob_id: string;
  commit_id?: string;
  last_commit_id?: string;
};

export type Deployment = {
  id: number;
  status: string;
  environment?: { id: number; name: string };
  ref?: string;
  sha?: string;
  created_at?: string;
  updated_at?: string;
  user?: GitlabUserRef;
  deployable?: { id: number; status: string };
};

export type Environment = {
  id: number;
  name: string;
  state?: string;
  last_deployment?: Deployment;
};

export type Event = {
  id?: number;
  action_name?: string;
  target_type?: string;
  target_title?: string;
  author?: GitlabUserRef;
  created_at?: string;
  push_data?: Record<string, unknown>;
};

export type VulnerabilityFinding = {
  id?: number;
  report_type?: string;
  name?: string;
  severity?: string;
  description?: string | null;
  location?: Record<string, unknown>;
  project_fingerprint?: string;
  uuid?: string;
};

export type AuditEvent = {
  id: number;
  author?: GitlabUserRef;
  entity_type?: string;
  entity_id?: number;
  details?: Record<string, unknown>;
  created_at?: string;
};
