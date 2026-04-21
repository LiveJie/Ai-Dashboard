import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {
  DashboardOutlined,
  ApiOutlined,
  AccountTreeOutlined,
  BarChartOutlined,
  SettingsOutlined
} from '@mui/icons-material';


const drawerWidth = 280;

const navItems = [
  { path: '/', title: '仪表板', icon: 'DashboardOutlined' },
  { path: '/ai-models', title: 'AI模型管理', icon: 'ApiOutlined' },
  { path: '/projects', title: '项目管理', icon: 'AccountTreeOutlined' },
  { path: '/analytics', title: '数据分析', icon: 'BarChartOutlined' },
  { path: '/settings', title: '系统设置', icon: 'SettingsOutlined' }
];

const iconMap = {
  DashboardOutlined: DashboardOutlined,
  ApiOutlined: ApiOutlined,
  AccountTreeOutlined: AccountTreeOutlined,
  BarChartOutlined: BarChartOutlined,
  SettingsOutlined: SettingsOutlined
};

const NavItem = ({ item }) => {
  const Icon = iconMap[item.icon];
  return (
    <ListItemButton
      component={NavLink}
      to={item.path}
      sx={{
        borderRadius: 2,
        mx: 1,
        my: 0.5,
        '&.active': {
          bgcolor: 'rgba(99, 102, 241, 0.10)',
          color: 'primary.main'
        }
      }}
    >
      <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{Icon ? <Icon /> : null}</ListItemIcon>
      <ListItemText primary={item.title} primaryTypographyProps={{ fontWeight: 600 }} />
    </ListItemButton>
  );
};

const MainLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const title = useMemo(() => {
    const match = navItems.find((i) => i.path === location.pathname);
    return match?.title || 'Dashboard';
  }, [location.pathname]);

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#111827', color: '#E5E7EB' }}>
      <Toolbar sx={{ px: 3, minHeight: 72 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
          AI Dashboard
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <List sx={{ mt: 1 }}>
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: 'calc(100% - ' + drawerWidth + 'px)' },
          ml: { sm: drawerWidth + 'px' },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(!mobileOpen)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 0 }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: 'calc(100% - ' + drawerWidth + 'px)' },
          bgcolor: 'background.default',
          minHeight: '100vh',
          px: { xs: 2, sm: 4 },
          py: 4
        }}
      >
        <Toolbar sx={{ minHeight: 72 }} />
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
