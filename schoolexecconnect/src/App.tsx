import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Credo from './pages/Credo'
import FAQs from './pages/FAQs'
import OtherServices from './pages/OtherServices'
import AvailablePositions from './pages/AvailablePositions'
import CompletedSearches from './pages/CompletedSearches'
import Contact from './pages/Contact'

function App() {
    return (
        <div className="app">
            <Navbar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about-us" element={<About />} />
                    <Route path="/credo" element={<Credo />} />
                    <Route path="/faqs" element={<FAQs />} />
                    <Route path="/other-services" element={<OtherServices />} />
                    <Route path="/available-positions" element={<AvailablePositions />} />
                    <Route path="/completed-searches" element={<CompletedSearches />} />
                    <Route path="/contact-us" element={<Contact />} />
                </Routes>
            </main>
            <Footer />
        </div>
    )
}

export default App
