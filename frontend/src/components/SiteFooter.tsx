import {Icon} from '@iconify/react'
import mailIcon from '@iconify-icons/lucide/mail'
import {Link} from 'react-router-dom'

import {ThoughtHubIcon} from './ThoughtHubIcon'

export function SiteFooter() {
    return (
        <footer className="site-footer">
            <div className="app-shell site-footer__main">
                <div className="site-footer__introduction">
                    <Link className="site-footer__brand" to="/">
                        <ThoughtHubIcon className="site-footer__mark"/>
                        <span>ThoughtHub</span>
                    </Link>
                    <p>
                        A thoughtful place for university voices, useful ideas,
                        and perspectives worth sharing.
                    </p>
                </div>
                <nav className="site-footer__navigation" aria-label="Footer navigation">
                    <strong>Explore</strong>
                    <Link to="/categories">Categories and tags</Link>
                    <Link to="/guidelines">Guidelines</Link>
                    <Link to="/help">Help</Link>
                </nav>
                <address className="site-footer__developer" aria-label="Developer contact">
                    <span className="site-footer__label">Developer</span>
                    <strong>Arya Tavana</strong>
                    <span>Designing and building ThoughtHub.</span>
                    <a href="mailto:aryatavana07@gmail.com">
                        <Icon icon={mailIcon} aria-hidden="true"/>
                        <span>
                            aryatavana07@gmail.com
                        </span>
                    </a>
                </address>
            </div>
            <div className="app-shell site-footer__bottom">
                <span>© 2026 ThoughtHub. All rights reserved.</span>
                <span>Made for ideas worth sharing.</span>
            </div>
        </footer>
    )
}
