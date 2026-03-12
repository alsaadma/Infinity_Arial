import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0B1628",
      paper:   "#111E35",
    },
    primary:   { main: "#4A9EFF" },
    secondary: { main: "#E3A008" },
    success:   { main: "#22C55E" },
    warning:   { main: "#F59E0B" },
    error:     { main: "#EF4444" },
    text: {
      primary:   "#F0F4FF",
      secondary: "#8FA3C0",
    },
    divider: "rgba(255,255,255,0.08)",
  },
  typography: {
    fontFamily: "Inter, Roboto, Arial, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: "#0B1628",
          color: "#F0F4FF",
          minHeight: "100vh",
        },
        "*::-webkit-scrollbar": { width: 6 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.15)",
          borderRadius: 3,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(255,255,255,0.07)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: "1px solid rgba(255,255,255,0.07)" },
        head: {
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: "#8FA3C0",
          background: "rgba(255,255,255,0.03)",
        },
      },
    },
  },
});

export default theme;
