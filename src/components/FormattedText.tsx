import React from "react";

const COMMON_TLDS = new Set([
  "com", "org", "net", "edu", "gov", "io", "co", "me", "gle", "ly", "site", "app", 
  "dev", "link", "info", "online", "tech", "ai", "store", "xyz", "club", "live", 
  "page", "ca", "uk", "in", "de", "fr", "jp", "au", "us", "br", "ch", "it", "nl", "se", "no", "es", "ru"
]);

interface FormattedTextProps {
  text?: string | null;
  className?: string;
  linkClassName?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  className = "",
  linkClassName = ""
}) => {
  if (!text) return null;

  const parseText = (input: string) => {
    // Match URLs starting with http://, https://, www., or domain names with path/common TLD
    const urlRegex = /(?:https?:\/\/|www\.)[^\s<]+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b(?:\/[^\s<]*)?/gi;

    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(input)) !== null) {
      const start = match.index;
      let fullMatch = match[0];

      // Skip if part of an email address or preceded by word characters without http/www
      if (start > 0) {
        const prevChar = input[start - 1];
        if (prevChar === "@" || (/[a-zA-Z0-9._-]/.test(prevChar) && !fullMatch.startsWith("http://") && !fullMatch.startsWith("https://") && !fullMatch.startsWith("www."))) {
          continue;
        }
      }

      // Clean trailing punctuation from URL match
      let cleanUrl = fullMatch;
      let trailingPunct = "";
      while (/[.,!?:;)\\]$/.test(cleanUrl)) {
        if (cleanUrl.endsWith(")") && cleanUrl.includes("(")) break;
        trailingPunct = cleanUrl.slice(-1) + trailingPunct;
        cleanUrl = cleanUrl.slice(0, -1);
      }

      if (!cleanUrl) continue;

      // Filter domain-only matches that aren't common TLDs and don't have a path
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("www.")) {
        const domainPart = cleanUrl.split("/")[0];
        const parts = domainPart.split(".");
        const tld = parts[parts.length - 1].toLowerCase();

        if (!COMMON_TLDS.has(tld) && !cleanUrl.includes("/")) {
          continue;
        }
      }

      // Add text leading up to the URL
      if (start > lastIndex) {
        result.push(input.slice(lastIndex, start));
      }

      // Ensure proper protocol
      let href = cleanUrl;
      if (!/^https?:\/\//i.test(href)) {
        href = "https://" + href;
      }

      result.push(
        <a
          key={`${start}-${cleanUrl}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer break-all font-medium ${linkClassName}`}
        >
          {cleanUrl}
        </a>
      );

      if (trailingPunct) {
        result.push(trailingPunct);
      }

      lastIndex = start + fullMatch.length;
    }

    if (lastIndex < input.length) {
      result.push(input.slice(lastIndex));
    }

    return result;
  };

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {parseText(text)}
    </span>
  );
};
