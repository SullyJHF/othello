import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { ReactNode } from 'react';
import { ToastContainer } from 'react-toastify';
import { ProvideSocket } from './socketHooks';

interface WrapperProps {
  children: ReactNode;
}
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
  const wrapper = ({ children }: WrapperProps) => (
    <>
      <ProvideSocket>
        <ToastContainer position="top-center" limit={3} theme="colored" autoClose={5000} />
        {children}
      </ProvideSocket>
    </>
  );
  return { /* store, */ ...rtlRender(ui, { wrapper, ...renderOptions }) };
};

export function getByTextContent(textMatch: string) {
  return screen.getByText((content, node) => {
    const hasText = (n: Element | null): boolean => {
      return n?.textContent === textMatch;
    };
    const nodeHasText = node ? hasText(node) : false;
    const childrenDontHaveText = Array.from(node?.children || []).every((child) => !hasText(child));
    return nodeHasText && childrenDontHaveText;
  });
}

// Re-export everything except render from @testing-library/react
export {
  cleanup,
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
  within,
  getByRole,
  getByText,
  getByLabelText,
  getByPlaceholderText,
  getByTestId,
  getByDisplayValue,
  getByAltText,
  getByTitle,
  getAllByRole,
  getAllByText,
  getAllByLabelText,
  getAllByPlaceholderText,
  getAllByTestId,
  getAllByDisplayValue,
  getAllByAltText,
  getAllByTitle,
  queryByRole,
  queryByText,
  queryByLabelText,
  queryByPlaceholderText,
  queryByTestId,
  queryByDisplayValue,
  queryByAltText,
  queryByTitle,
  queryAllByRole,
  queryAllByText,
  queryAllByLabelText,
  queryAllByPlaceholderText,
  queryAllByTestId,
  queryAllByDisplayValue,
  queryAllByAltText,
  queryAllByTitle,
  findByRole,
  findByText,
  findByLabelText,
  findByPlaceholderText,
  findByTestId,
  findByDisplayValue,
  findByAltText,
  findByTitle,
  findAllByRole,
  findAllByText,
  findAllByLabelText,
  findAllByPlaceholderText,
  findAllByTestId,
  findAllByDisplayValue,
  findAllByAltText,
  findAllByTitle,
  prettyDOM,
  logRoles,
} from '@testing-library/react';

// Export our custom render and userEvent
export { render, userEvent };
