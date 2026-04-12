import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import Filters from './components/Filters'
import IssueList from './components/IssueList'
import LinkSuggestions from './components/LinkSuggestions'
import SlackSection from './components/SlackSection'

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <SummaryCards />
        <Filters />
        <LinkSuggestions />
        <IssueList />
        <SlackSection />
      </main>
    </div>
  )
}
