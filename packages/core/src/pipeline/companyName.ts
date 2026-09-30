
export function guessCompanyName(companyUrl: string): string {
  let hostname: string;
  try {
    hostname = new URL(companyUrl).hostname.replace(/^www\./, "");
  } catch {
    return companyUrl;
  }
  const label = hostname.split(".")[0] || hostname;
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
