import fs from "node:fs";

// Project settings
const LANGUAGE = "typescript";
const PROJECT_TAGS = [LANGUAGE, "library"];

// Load package.json
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

// Extract GitHub repository from homepage
let github = "";
if (pkg.homepage) {
  const homepageUrl = new URL(pkg.homepage);
  homepageUrl.hash = "";
  github = homepageUrl.toString();
}

// Fallback to repository field if homepage isn't set
if (!github && pkg.repository) {
  const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository.url;
  github = repo.replace(/^git\+/, "").replace(/\.git$/, "");
}

// Add keywords to tags (with safety check)
const keywords = pkg.keywords || [];
const tags = [...new Set([...PROJECT_TAGS, ...keywords])];

// Remove description quotes and trailing period for cleaner output
const description = pkg.description.replace(/^["']|["']$/g, "").replace(/\.$/, "");

// Frontmatter for later...
const frontMatter = `---
title: ${pkg.name} API Documentation
description: ${description}
package: "${pkg.name}"
version: ${pkg.version}
language: ${LANGUAGE}
npm: https://www.npmjs.com/package/${pkg.name}
github: ${github}
tags:
  - ${tags.join("\n  - ")}
---
`;

const header = `# ${pkg.name} API Documentation

Complete API for [${pkg.name}](README.md) - ${pkg.description.slice(0, 1).toLowerCase() + pkg.description.slice(1)}.

`;

const apiContent = fs.readFileSync("API.md", "utf8");
fs.writeFileSync("API.md", header + apiContent);
