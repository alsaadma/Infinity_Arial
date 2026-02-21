import React from "react";
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";

const drawerWidth = 240;

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Quote Builder", to: "/quote" },
  { label: "Ops Readiness", to: "/ops" },
  { label: "Library", to: "/library" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6" noWrap>
            Drones Calc
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={loc.pathname === item.to}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          marginLeft: `${drawerWidth}px`,
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
