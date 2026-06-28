// @ts-nocheck
import { useSelector } from 'react-redux';
import ChangePassword from './ChangePassword';
import DifferentAuth from './DifferentAuth';

function Security() {
    const { user } = useSelector(state => state.auth);
    const providerId = user?.providerId;
    return (
        <div className='change-password'>
            {providerId === "email" ? (
                <ChangePassword />
            ) : (
                <DifferentAuth providerId={providerId} />
            )}
        </div>
    );
}

export default Security;
