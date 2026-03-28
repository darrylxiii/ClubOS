const React = require('react');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const { renderToString } = require('react-dom/server');

const AppRoutes = () => React.createElement(Routes, null, 
  React.createElement(Route, { path: "/home", element: React.createElement("div", null, "Home") }),
  React.createElement(Route, { path: "/admin", element: React.createElement("div", null, "Admin") })
);

const App = () => React.createElement(MemoryRouter, { initialEntries: ["/home"] },
  React.createElement(Routes, null,
    React.createElement(Route, { path: "/public", element: React.createElement("div", null, "Public") }),
    React.createElement(Route, { path: "*", element: React.createElement(AppRoutes) })
  )
);

try {
  console.log(renderToString(React.createElement(App)));
} catch (e) {
  console.error("ERROR", e.message);
}
