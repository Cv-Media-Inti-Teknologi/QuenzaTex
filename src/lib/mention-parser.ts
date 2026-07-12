const MENTION_REGEX = /@([\w\/\\\-]+\.\w+)/g

export interface MentionMatch {
  name: string
  path: string | null
  fullMatch: string
  index: number
}

export function parseMentions(text: string): MentionMatch[] {
  const mentions: MentionMatch[] = []
  let match

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    mentions.push({
      name: match[1],
      path: null,
      fullMatch: match[0],
      index: match.index,
    })
  }

  return mentions
}

export function buildPromptWithContext(
  message: string,
  fileContexts: { path: string; content: string }[]
): string {
  if (fileContexts.length === 0) return message

  const contextBlocks = fileContexts
    .map((fc) => `[File: ${fc.path}]\n\`\`\`\n${fc.content}\n\`\`\``)
    .join("\n\n")

  return `${contextBlocks}\n\nUser request:\n${message}`
}
