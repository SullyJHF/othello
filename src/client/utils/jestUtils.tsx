import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ToastContainer } from 'react-toastify';
// import { ProvideSocket } from './socket';

const render = (
  ui: React.ReactElement,
  {
    // preloadedState = {},
    // store = configureStore({
    //   reducer: {
    //     auth: authReducer,
    //     lock: lockReducer,
    //     users: usersReducer,
    //     editor: editorReducer,
    //     roles: rolesReducer,
    //     queue: queueReducer,
    //     projects: projectsReducer,
    //     stats: statsReducer,
    //   },
    //   preloadedState,
    // }),
    // route = '/',
    ...renderOptions
  } = {},
) => {
  // window.history.pushState({}, 'Robot Manager Page', route);
  const wrapper = ({ children }) => (
    <>
      {/* <ProvideSocket> */}
      <ToastContainer position="top-center" limit={3} theme="colored" autoClose={5000} />
      {children}
      {/* </ProvideSocket> */}
    </>
  );
  return { /* store, */ ...rtlRender(ui, { wrapper, ...renderOptions }) };
};

export function getByTextContent(textMatch: string) {
  return screen.getByText((content, node) => {
    const hasText = (n: Element) => n.textContent === textMatch;
    const nodeHasText = hasText(node);
    const childrenDontHaveText = Array.from(node?.children || []).every((child) => !hasText(child));
    return nodeHasText && childrenDontHaveText;
  });
}

export * from '@testing-library/react';
export { render, userEvent };
