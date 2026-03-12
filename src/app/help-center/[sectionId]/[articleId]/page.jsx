import { notFound } from 'next/navigation'
import HelpCenterArticlePage from '@/components/help-center/HelpCenterArticlePage'
import {
  getAllHelpCenterArticleParams,
  getHelpCenterArticle,
  HELP_CENTER_SECTIONS,
} from '@/components/help-center/helpCenterData.mjs'

export function generateStaticParams() {
  return getAllHelpCenterArticleParams()
}

export function generateMetadata({ params }) {
  const result = getHelpCenterArticle(params.sectionId, params.articleId)

  if (!result) {
    return {
      title: 'Help Center | OCPRIMES',
    }
  }

  return {
    title: `${result.article.title} | Help Center | OCPRIMES`,
  }
}

export default function HelpCenterArticleRoute({ params }) {
  const result = getHelpCenterArticle(params.sectionId, params.articleId)

  if (!result) {
    notFound()
  }

  return (
    <HelpCenterArticlePage
      section={result.section}
      article={result.article}
      allSections={HELP_CENTER_SECTIONS}
    />
  )
}
