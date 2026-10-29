import { render, screen } from '@testing-library/react'
import Home from './Home.tsx'

describe('Home', () => {
  it('shows the wordmark and the given date', () => {
    render(<Home now={new Date(2026, 9, 29)} />)

    expect(screen.getByText('soon')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thursday 29 October')
  })
})
