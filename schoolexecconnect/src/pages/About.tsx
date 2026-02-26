import './About.css'

const partners = [
    'Dr. Kevin O\'Mara',
    'David Clough',
    'Dr. John (Jack) Linehan',
    'Mr. Lawrence Lobert',
    'Mr. Robert Ostlund',
    'Ms. Diane Robertson',
]

const seniorAssociates = [
    'Dr. Gerald Freitag',
    'Dr. Mark Giconi',
    'Ms. Patty Phillips',
    'Dr. John Sawyer III',
    'Dr. Timothy Shimp',
]

const associates = [
    'Dr. Elizabeth Alvarez',
    'Ms. Lisa Anderson',
    'Dr. Patricia Ward',
    'Antony',
    'Dr. Brian Barnhart',
    'Dr. Judy Bauman',
    'Dr. Terry Bremer',
    'Dr. Terri Bresenhan',
    'Mr. David Brusak',
    'Dr. John Eiskholt',
    'Dr. E. Scott England',
    'Dr. John Farney',
    'Mr. Todd Fox',
    'Dr. Jill Gildea',
    'Dr. Dean Gorrell',
    'Mr. Ralph Grimm',
    'Dr. Chris Harwell',
    'Dr. William Harbron',
    'Dr. Shardley Hyatt',
    'Dr. Jill W. Hawk',
    'Dr. Andria Jgore',
    'Ms. Deborah Kerr',
    'Dr. Raymond Lauk',
    'Dr. Donna S. Leak',
    'Dr. Richard Marcheshy',
    'Dr. Benjamin Martindale',
    'Dr. Keith Marty',
    'Dr. Steve Matthews',
    'Dr. Fredrick McDowell',
    'Dr. David McGhee',
    'Dr. Desmond Means',
    'Dr. Joseph Meloche',
    'Dr. Diane Monogue',
    'Dr. Tim Gragger',
    'Dr. David Fuset',
    'Mr. David Pruneau',
    'Dr. Angela Romano',
    'Dr. Renita Collins',
    'Dr. Bhavna Sharma-Lewis',
    'Dr. Philip Salemi',
    'Dr. Joe Shenin',
    'Dr. JoAnn Sternes',
    'Dr. Jennifer Thayer',
    'Dr. Sandra Thomas',
    'Dr. David Vick',
    'Dr. Gregory Wright',
]

export default function About() {
    return (
        <div className="about-page">
            <div className="about-layout">
                {/* Left Sidebar */}
                <aside className="about-sidebar">
                    <div className="about-sidebar__section">
                        <h4 className="about-sidebar__heading">PARTNERS</h4>
                        <p className="about-sidebar__sub">President</p>
                        <p className="about-sidebar__name">Dr. Kevin O'Mara</p>
                        <p className="about-sidebar__sub">Partners</p>
                        {partners.slice(1).map((name, i) => (
                            <p key={i} className="about-sidebar__name">{name}</p>
                        ))}
                    </div>

                    <div className="about-sidebar__section">
                        <h4 className="about-sidebar__heading">SENIOR ASSOCIATES</h4>
                        {seniorAssociates.map((name, i) => (
                            <p key={i} className="about-sidebar__name">{name}</p>
                        ))}
                    </div>

                    <div className="about-sidebar__section">
                        <h4 className="about-sidebar__heading">ASSOCIATES</h4>
                        {associates.map((name, i) => (
                            <p key={i} className="about-sidebar__name">{name}</p>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <div className="about-main">
                    <h1>About Us</h1>
                    <h2>MEET OUR PARTNERS AND ASSOCIATES</h2>

                    <p>
                        School Exec Connect consultants can meet the complex needs of education today. School Exec Connect Partners and Associates have exceptional reputations and are regarded as highly knowledgeable about leadership and leaders. We conduct searches for all levels of education executives and consult on a variety of topics related to school improvement, planning, and board governance. We have worked successfully with districts across the nation and bring decades of experience to meet your needs. Please view more details about the services we offer by clicking on "Other Services."
                    </p>

                    <p>
                        Our consultants have extensive nation-wide networks that enable them to know personally the finest superintendents and principals throughout the country. Our consultants hold collective memberships in the top state and national educational organizations, teach at colleges and universities throughout the country, are published authors, and have won prestigious educational awards. They are leaders in the field.
                    </p>

                    <h3>Kevin O'Mara, President</h3>
                    <p>
                        Dr. Kevin O'Mara, President of SCHOOL EXEC CONNECT, has been with the firm for six years and has led numerous searches throughout the Midwest. The retired Superintendent of Argo Community High School District, Dr. O'Mara is currently Associate Professor in Educational Leadership at Concordia University Chicago, teaching doctoral students who are also pursuing general administrative and superintendent licensure. Guided by a fundamental belief in the value of collaboration, reflection, and capacity-building, O'Mara teaches new and experienced leaders that their dedication, knowledge, and input directly impact and enrich young lives. Working in public education for thirty years, he served as a teacher, Dean of Students, Principal, and Superintendent.
                    </p>

                    <p>
                        Dr. O'Mara's many significant accomplishments include United States State Department Fulbright Foundation candidate stationed to Argentina; Illinois High School Organization President; Illinois Association of School Administrators Board of Directors; St. Ignatius College Prep President's Medal Awardee; and Rosary College Graduate of the Last Decade (GOLD) Awardee.
                    </p>

                    <p>
                        Dr. O'Mara has a Bachelor's Degree in Mathematics from Dominican University, a Master's Degree in Public School Administration from Concordia University Chicago, and a Doctorate in Educational Leadership from Concordia University Chicago. During Dr. O'Mara's nine years as a school superintendent, he served on several state-wide Illinois public education committees, including Governor Pritzker's Education Transition Committee in 2018-19.
                    </p>

                    <h3>David Clough, Partner</h3>
                    <p>
                        Dave Clough, Ph. D., has conducted school executive searches since 1999. He is the retired superintendent of Libertyville/Vernon Hills High School District (CHSD 128) in the northern suburbs of Chicago. He has had more than 30 years of administrative experience encompassing all levels of education throughout the Midwest and has served outstanding school districts in Minnesota, Nebraska and Illinois.
                    </p>

                    <p>
                        Dave is well connected to prospective administrative candidates through a comprehensive network but also through holding a number of key leadership positions, including serving as the past President of the Lake County Superintendents Association, President of the Mid American Association of School Superintendents and President of the Superintendents Roundtable of Northern Illinois. He is also an active member of Suburban School Superintendents (SSS), IASA/IASA and the Illinois Association of School Boards. Dave has presented nationally and regionally on topics ranging from administrative competencies to school quality assessments.
                    </p>

                    <h3>Dr. John (Jack) Linehan, Partner</h3>
                    <p>
                        Jack Linehan Ed.D, retired from the Shorewood School District (WI) after 18 years of service–7 as high school principal, the last 11 as superintendent. Earlier, he served as teacher, counselor, coach, activities director, and assistant principal with the Whitefish Bay (WI) schools.
                    </p>

                    <p>
                        He is currently Director of the Superintendent Development Program and Chair of Doctoral Admissions at Cardinal Stritch University in Milwaukee. He has been a consultant to public and private schools throughout the region.
                    </p>

                    <h3>Mr. Lawrence Lobert, Partner</h3>
                    <p>
                        HR Consultant, Larry Lobert and Associates; retired assistant superintendent, Grosse Pointe Public Schools (MI) and former HR Director, New Trier HS (IL)
                    </p>

                    <h3>Robert Ostlund, Partner</h3>
                    <p>
                        Robert (Bob) Ostlund has been conducting searches with School Exec Connect since 2008, after retiring as Superintendent of the highly respected Wayzata MN Public School District. He served Minnesota schools as a science teacher, Associate Principal, Director of Administrative Services, Headmaster or Superintendent for a total of 42 years. Throughout his career, he was heavily involved in all aspects of human resource administration including negotiations, contract administration, recruitment and evaluation. He was actively involved in professional associations at every level, including serving as President of the Minnesota Association of School Administrators. He was selected as the Twin City Metro Area Administrator of the Year in 2008.
                    </p>

                    <h3>Ms. Diane Robertson, Partner</h3>
                    <p>
                        Diane Robertson has been an educator for 34 years, having served as a teacher, principal, and superintendent. She recently retired after 19 years as the superintendent of Community Unit School District #4 in Mendon, IL. She currently leads the downstate Illinois searches for the firm and serves as a mentor for new and veteran superintendents.
                    </p>
                </div>
            </div>
        </div>
    )
}
