import {Link} from 'react-router-dom'

export function SiteFooter() {
    return (
        <footer className="site-footer">
            <div className="app-shell site-footer__inner">
                <Link className="site-footer__brand" to="/">
                    <span>ThoughtHub</span>
                    <small>A modern home for university voices.</small>
                </Link>
                <nav aria-label="Footer navigation">
                    <Link to="/topics/technology">Topics</Link>
                    <Link to="/guidelines">Guidelines</Link>
                    <Link to="/help">Help</Link>
                </nav>
                <span>© 2026 ThoughtHub</span>
            </div>
        </footer>
    )
}
