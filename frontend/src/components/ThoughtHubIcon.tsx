import thoughtHubIconDark from '../../../design/logos/thoughthub-icon-dark.svg'
import thoughtHubIconLight from '../../../design/logos/thoughthub-icon-light.svg'

type ThoughtHubIconProps = {
    className?: string
}

export function ThoughtHubIcon({className = ''}: ThoughtHubIconProps) {
    return (
        <span
            className={`thought-hub-icon ${className}`.trim()}
            aria-hidden="true"
        >
            <img
                className="thought-hub-icon__image thought-hub-icon__image--dark"
                src={thoughtHubIconDark}
                alt=""
            />
            <img
                className="thought-hub-icon__image thought-hub-icon__image--light"
                src={thoughtHubIconLight}
                alt=""
            />
        </span>
    )
}
