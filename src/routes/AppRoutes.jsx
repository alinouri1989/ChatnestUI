import { useSelector } from 'react-redux';
import { Route, Routes, Navigate } from 'react-router-dom';

import Sign from "../pages/Sign/Sign.jsx";
import Layout from '../layout/Layout.jsx';
import Chats from '../components/Chats/Chats.jsx';
import Archives from '../components/Archives/Archives.jsx';
import Groups from '../components/Groups/Groups.jsx';
import Calls from '../components/Calls/Calls.jsx';
import Home from '../components/Home/Home.jsx';

function AppRoutes() {

    const { user } = useSelector((state) => state.auth);

    return (
        <Routes>
            {!user && (
                <>
                    <Route path="/sign-in" element={<Sign />} />
                    <Route path="/sign-up" element={<Sign />} />
                    <Route path="/reset-password" element={<Sign />} />
                    <Route path="/reset-password/confirm" element={<Sign />} />
                    <Route path="*" element={<Navigate to="/sign-in" replace />} />
                </>
            )}

            {user && (
                <>
                    <Route path="/" element={<Navigate to="/home" replace />} />

                    <Route path="/" element={<Layout />}>
                        <Route path="home" element={<Home />} />
                        <Route path="chats" element={<Chats />} />
                        <Route path="chats/:id" element={<Chats />} />
                        <Route path="archives" element={<Archives />} />
                        <Route path="archives/:id" element={<Chats />} />
                        <Route path="groups" element={<Groups />} />
                        <Route path="groups/:id" element={<Groups />} />
                        <Route path="calls" element={<Calls />} />
                        <Route path="calls/:id" element={<Calls />} />
                    </Route>

                    <Route path="/sign-in" element={<Navigate to="/home" replace />} />
                    <Route path="/sign-up" element={<Navigate to="/home" replace />} />
                    <Route path="/reset-password" element={<Navigate to="/home" replace />} />
                    <Route path="/reset-password/confirm" element={<Navigate to="/home" replace />} />
                </>
            )}

            <Route path="*" element={<Navigate to={user ? "/home" : "/sign-in"} replace />} />
        </Routes>
    );
}

export default AppRoutes;
