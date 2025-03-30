import { Box, Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { Chat as ChatIcon, Explore as ExploreIcon, Person as PersonIcon } from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router-dom';

const Layout = () => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'calc(56px + env(safe-area-inset-bottom))'
            }}
        >
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <Outlet />
            </Box>
            <Paper
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    paddingBottom: 'env(safe-area-inset-bottom)'
                }}
                elevation={3}
            >
                <BottomNavigation
                    showLabels
                    onChange={(event, newValue) => {
                        switch (newValue) {
                            case 0:
                                navigate('/chat');
                                break;
                            case 1:
                                navigate('/explore');
                                break;
                            case 2:
                                navigate('/profile');
                                break;
                        }
                    }}
                >
                    <BottomNavigationAction label="Chat" icon={<ChatIcon />} />
                    <BottomNavigationAction label="Explore" icon={<ExploreIcon />} />
                    <BottomNavigationAction label="我的" icon={<PersonIcon />} />
                </BottomNavigation>
            </Paper>
        </Box>
    );
};

export default Layout; 