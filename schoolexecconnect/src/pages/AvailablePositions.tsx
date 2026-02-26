import { Link } from 'react-router-dom'
import './AvailablePositions.css'

const positions = [
    {
        title: 'Superintendent',
        district: 'South Holland School District 151',
        location: 'South Holland, IL',
        closed: false,
    },
    {
        title: 'Superintendent',
        district: 'St. Francis Public School District',
        location: 'St. Francis, WI',
        closed: false,
    },
    {
        title: 'Superintendent',
        district: 'Elwood Community Consolidated School District 203',
        location: 'Elwood, IL',
        closed: true,
    },
    {
        title: 'Superintendent',
        district: 'Central Unit School District 301',
        location: 'Burlington, IL',
        closed: false,
    },
    {
        title: 'Superintendent',
        district: 'Somonauk CUSD 432',
        location: 'Somonauk, IL',
        closed: true,
    },
    {
        title: 'Elementary Principal',
        district: 'Downtown Montessori Academy',
        location: 'Milwaukee, WI',
        closed: true,
    },
    {
        title: 'Superintendent',
        district: 'Homewood School District 153',
        location: 'Homewood, IL',
        closed: true,
    },
]

export default function AvailablePositions() {
    return (
        <div className="positions-page">
            <div className="positions-layout">
                {/* Main Content */}
                <div className="positions-main">
                    <h1>Available Positions</h1>

                    <h3>Current Searches</h3>
                    <p>
                        The current School Exec Connect searches are listed in the right column of this page. Each search has a description of the district and its website address for you to learn more about the district.
                    </p>
                    <p>
                        Every search has a calendar that gives the timeline of the process. Please pay particular attention to the closing time for accepting applications if you are interested in applying for a position.
                    </p>
                    <p>
                        When a search is closed, the name of the person who has been offered a contract for the position will appear when you click on the district name.
                    </p>

                    <h3>Instructions for Applying for a Position</h3>
                    <ol>
                        <li>
                            If you wish to apply for a position, you may apply in two ways. Either click on the application button that accompanies each district or use the navigation button "Apply for a Position" at the top of the website as a new user, unless other instructions are given.
                        </li>
                        <li>
                            You must complete an initial application as a new user. After you have submitted your first application, you may access it for other searches in which you are interested.
                        </li>
                        <li>
                            You may complete an application in "Open Applications" if you wish to have your application on file, but do not yet see a position for which you are interested.
                        </li>
                        <li>
                            If you are selected for an interview, you will be requested to bring original transcripts and proof of endorsements/certificates to your interview. Letters of recommendation will also be requested at that time. Follow each district's individualized calendar to determine the progress of the search in which you are interested.
                        </li>
                        <li>
                            If you have questions regarding a search, call the School Exec Connect office at (312)-780-1462 or email by clicking on the partner with whom you wish to communicate located in the "Contact Us" section of the Website.
                        </li>
                        <li>
                            All people who are contacted for an interview will be informed of their progress throughout the search.
                        </li>
                    </ol>
                </div>

                {/* Right Sidebar */}
                <aside className="positions-sidebar">
                    <h4 className="positions-sidebar__heading">AVAILABLE POSITIONS</h4>
                    <ul className="positions-sidebar__list">
                        {positions.map((pos, i) => (
                            <li key={i} className="positions-sidebar__item">
                                <span className="positions-sidebar__arrow">›</span>
                                <div>
                                    <span className="positions-sidebar__title">{pos.title}</span>
                                    <br />
                                    <span className="positions-sidebar__district">{pos.district}</span>
                                    <br />
                                    <span className="positions-sidebar__location">{pos.location}</span>
                                    {pos.closed && (
                                        <>
                                            <br />
                                            <span className="positions-sidebar__closed">Position Closed – click for results</span>
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>

                    <h4 className="positions-sidebar__heading positions-sidebar__heading--apply">APPLY FOR A POSITION</h4>
                    <p className="positions-sidebar__apply-text">
                        Click on the application button that accompanies each district at the bottom of the job post
                    </p>
                </aside>
            </div>
        </div>
    )
}
