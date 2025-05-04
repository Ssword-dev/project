interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  url: string;
  html_url: string;
  type: string;
}

interface GitHubUserOrOrganization extends GitHubUser {
  node_id: string;
  gravatar_id: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  site_admin: boolean;
}

interface GitHubRepositoryPermissions {
  admin: boolean;
  push: boolean;
  pull: boolean;
}

interface GitHubLicense {
  key: string;
  name: string;
  spdx_id: string;
  url: string | null;
  node_id: string;
}

interface GitHubCommitUserInfo {
  name: string;
  email: string;
  date: string;
}

interface GitHubCommitTree {
  sha: string;
  url: string;
}

interface GitHubCommitVerification {
  verified: boolean;
  reason: string;
  signature: string | null;
  payload: string | null;
}

interface GitHubCommitMeta {
  author: GitHubCommitUserInfo;
  committer: GitHubCommitUserInfo;
  message: string;
  tree: GitHubCommitTree;
  url: string;
  comment_count: number;
  verification: GitHubCommitVerification;
}

interface GitHubCommitParent {
  sha: string;
  url: string;
  html_url: string;
}

interface GitHubCommit {
  sha: string;
  node_id: string;
  commit: GitHubCommitMeta;
  url: string;
  html_url: string;
  comments_url: string;
  author: GitHubUser | null;
  committer: GitHubUser | null;
  parents: GitHubCommitParent[];
}

interface GitHubBranchProtectionStatusCheck {
  context: string;
  app_id: number;
}

interface GitHubBranchProtectionRequiredStatusChecks {
  enforcement_level: "off" | "non_admins" | "everyone";
  contexts: string[];
  checks?: GitHubBranchProtectionStatusCheck[];
}

interface GitHubBranchProtection {
  enabled: boolean;
  required_status_checks: GitHubBranchProtectionRequiredStatusChecks | null;
}

interface GitHubBranch {
  name: string;
  protected: boolean;
  protection: GitHubBranchProtection;
  protection_url: string;
  commit: GitHubCommit;
}

interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUserOrOrganization;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  archive_url: string;
  assignees_url: string;
  blobs_url: string;
  branches_url: string;
  collaborators_url: string;
  comments_url: string;
  commits_url: string;
  compare_url: string;
  contents_url: string;
  contributors_url: string;
  deployments_url: string;
  downloads_url: string;
  events_url: string;
  forks_url: string;
  git_commits_url: string;
  git_refs_url: string;
  git_tags_url: string;
  git_url: string;
  issue_comment_url: string;
  issue_events_url: string;
  issues_url: string;
  keys_url: string;
  labels_url: string;
  languages_url: string;
  merges_url: string;
  milestones_url: string;
  notifications_url: string;
  pulls_url: string;
  releases_url: string;
  ssh_url: string;
  stargazers_url: string;
  statuses_url: string;
  subscribers_url: string;
  subscription_url: string;
  tags_url: string;
  teams_url: string;
  trees_url: string;
  clone_url: string;
  mirror_url: string | null;
  hooks_url: string;
  svn_url: string;
  homepage: string | null;
  language: string | null;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  size: number;
  default_branch: string;
  open_issues_count: number;
  is_template: boolean;
  topics: string[];
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_downloads: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: "public" | "private" | "internal";
  pushed_at: string;
  created_at: string;
  updated_at: string;
  permissions?: GitHubRepositoryPermissions;
  license: GitHubLicense | null;
  allow_forking: boolean;
  web_commit_signoff_required: boolean;
  subscribers_count: number;
  network_count: number;
  open_issues: number;
  watchers: number;
}

export type {
  GitHubUser,
  GitHubUserOrOrganization,
  GitHubRepository,
  GitHubRepositoryPermissions,
  GitHubLicense,
  GitHubBranch,
  GitHubBranchProtection,
  GitHubBranchProtectionRequiredStatusChecks,
  GitHubBranchProtectionStatusCheck,
  GitHubCommit,
  GitHubCommitMeta,
  GitHubCommitUserInfo,
  GitHubCommitVerification,
  GitHubCommitTree,
  GitHubCommitParent,
};
