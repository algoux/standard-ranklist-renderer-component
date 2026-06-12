import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EnumTheme } from '@algoux/standard-ranklist-utils';
import { DefaultSolutionModal, DefaultUserModal, Modal, ProgressBar } from '..';
import { describeAnimatedModalInteractionContract, type AnimatedModalAdapter } from '../../../../tests/shared/animated-modal-contract';
import {
  describeDefaultModalContentContract,
  describeModalComponentContract,
  makeRanklist,
  type DefaultSolutionModalRenderOptions,
  type DefaultUserModalRenderOptions,
  type ModalComponentAdapter,
  type ModalRenderOptions,
} from '../../../../tests/shared/modal-component-contract';

function toReactStyle(style?: Record<string, string>): React.CSSProperties | undefined {
  if (!style) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(style).map(([key, value]) => [
      key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  ) as React.CSSProperties;
}

const reactModalAdapter: ModalComponentAdapter = {
  target: 'React',
  renderModal(options: ModalRenderOptions = {}) {
    const closeReasons: string[] = [];
    let modalOptions: ModalRenderOptions = { ...options };
    const renderModalNode = () => (
      <Modal
        open={modalOptions.open ?? true}
        title={modalOptions.title ?? 'Standalone Modal'}
        width={modalOptions.width}
        rootClassName={modalOptions.rootClassName}
        wrapClassName={modalOptions.wrapClassName}
        style={toReactStyle(modalOptions.style)}
        closeOnEsc={modalOptions.closeOnEsc}
        closeOnMaskClick={modalOptions.closeOnMaskClick}
        onClose={(_, reason) => closeReasons.push(reason)}
      >
        <div>{modalOptions.body ?? 'Modal body'}</div>
      </Modal>
    );
    const rendered = render(renderModalNode());

    return {
      container: rendered.container.ownerDocument.body,
      cleanup: () => rendered.unmount(),
      update: (nextOptions) => {
        modalOptions = { ...modalOptions, ...nextOptions };
        act(() => {
          rendered.rerender(renderModalNode());
        });
      },
      getCloseReasons: () => closeReasons,
      clickCloseButton: () => {
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      },
      triggerMaskMouseDown: () => {
        const wrap = rendered.container.ownerDocument.body.querySelector('.srk-modal-wrap') as HTMLElement;
        fireEvent.mouseDown(wrap);
      },
      triggerEscape: () => {
        fireEvent.keyDown(rendered.container.ownerDocument, { key: 'Escape' });
      },
    };
  },
  renderDefaultUserModal(options: DefaultUserModalRenderOptions = {}) {
    const ranklist = makeRanklist();
    const user = options.user || ranklist.rows[0].user;
    const rendered = render(
      <DefaultUserModal
        open
        formatSrkAssetUrl={(url, field) => `proxied:${field}:${url}`}
        markers={options.markers || ranklist.markers}
        theme={EnumTheme.light}
        user={user}
        languages={options.languages}
      />,
    );

    return {
      container: rendered.container.ownerDocument.body,
      cleanup: () => rendered.unmount(),
      getPhotoSrc: () =>
        (rendered.container.ownerDocument.body.querySelector('img[alt="User portrait"]') as HTMLImageElement | null)?.getAttribute(
          'src',
        ) || null,
    };
  },
  renderDefaultSolutionModal(options: DefaultSolutionModalRenderOptions = {}) {
    const ranklist = makeRanklist();
    const status = ranklist.rows[0].statuses[0];
    const rendered = render(
      <DefaultSolutionModal
        open
        problem={options.problem || ranklist.problems[0]}
        problemIndex={options.problemIndex ?? 0}
        solutions={options.solutions || [...(status.solutions || [])].reverse()}
        user={options.user || ranklist.rows[0].user}
        languages={options.languages}
      />,
    );

    return {
      container: rendered.container.ownerDocument.body,
      cleanup: () => rendered.unmount(),
    };
  },
};

describeModalComponentContract(reactModalAdapter);
describeDefaultModalContentContract(reactModalAdapter);

const reactAnimatedModalAdapter: AnimatedModalAdapter = {
  target: 'React',
  renderInteractiveModal(options = {}) {
    const rendered = render(
      <Modal
        open={options.open ?? true}
        destroyOnClose={options.destroyOnClose}
        title={options.title ?? 'Standalone Modal'}
        width={options.width}
      >
        <div>{options.body ?? 'Modal body'}</div>
      </Modal>,
    );

    return {
      container: rendered.container.ownerDocument.body,
      cleanup: () => rendered.unmount(),
      update: (nextOptions) => {
        act(() => {
          rendered.rerender(
            <Modal
              open={nextOptions.open ?? true}
              destroyOnClose={nextOptions.destroyOnClose}
              title={nextOptions.title ?? 'Standalone Modal'}
              width={nextOptions.width}
            >
              <div>{nextOptions.body ?? 'Modal body'}</div>
            </Modal>,
          );
        });
      },
      advanceTime: (ms) => {
        act(() => {
          vi.advanceTimersByTime(ms);
        });
      },
    };
  },
  renderInteractiveDefaultUserModal() {
    const ranklist = makeRanklist();
    const user = ranklist.rows[0].user;
    const rendered = render(<DefaultUserModal open markers={ranklist.markers} theme={EnumTheme.light} user={user} />);

    return {
      container: rendered.container.ownerDocument.body,
      cleanup: () => rendered.unmount(),
      closeAndClearUser: () => {
        act(() => {
          rendered.rerender(
            <DefaultUserModal open={false} markers={ranklist.markers} theme={EnumTheme.light} user={null} />,
          );
        });
      },
      advanceTime: (ms) => {
        act(() => {
          vi.advanceTimersByTime(ms);
        });
      },
    };
  },
};

describeAnimatedModalInteractionContract(reactAnimatedModalAdapter);

describe('React modal components', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses explicit languages in the default user modal content', () => {
    const user = {
      id: 'team-i18n',
      name: {
        fallback: 'Fallback Team',
        en: 'English Team',
        'zh-CN': '中文队伍',
      },
      organization: {
        fallback: 'Fallback University',
        en: 'English University',
        'zh-CN': '中文大学',
      },
      teamMembers: [
        {
          name: {
            fallback: 'Fallback Member',
            en: 'English Member',
            'zh-CN': '中文队员',
          },
        },
      ],
      markers: ['regional'],
    } as srk.User;
    const markers = [
      {
        id: 'regional',
        label: {
          fallback: 'Fallback Marker',
          en: 'English Marker',
          'zh-CN': '中文标记',
        },
      },
    ] as srk.Marker[];

    const rendered = render(<DefaultUserModal open user={user} markers={markers} languages={['zh-CN']} />);

    expect(rendered.container.ownerDocument.body.textContent).toContain('中文队伍');
    expect(rendered.container.ownerDocument.body.textContent).toContain('中文大学');
    expect(rendered.container.ownerDocument.body.textContent).toContain('中文队员');
    expect(rendered.container.ownerDocument.body.textContent).toContain('中文标记');
  });

  it('uses explicit languages in the default solution modal title', () => {
    const user = {
      id: 'team-i18n',
      name: {
        fallback: 'Fallback Team',
        en: 'English Team',
        'zh-CN': '中文队伍',
      },
    } as srk.User;

    const rendered = render(
      <DefaultSolutionModal open user={user} problemIndex={0} solutions={[]} languages={['zh-CN']} />,
    );

    expect(rendered.container.ownerDocument.body.textContent).toContain('Solutions of A (中文队伍)');
  });

  it('emits time-travel changes from the internal range input', () => {
    const ranklist = makeRanklist();
    const onTimeTravel = vi.fn();

    render(<ProgressBar data={ranklist} enableTimeTravel onTimeTravel={onTimeTravel} />);

    const slider = screen.getByLabelText('Time Travel');
    fireEvent.mouseDown(slider);
    fireEvent.change(slider, { target: { value: '120' } });
    fireEvent.mouseUp(slider);

    expect(onTimeTravel).toHaveBeenCalledWith(120 * 60 * 1000);
    expect(screen.getByText('Time Travel Mode')).toBeTruthy();
  });
});
