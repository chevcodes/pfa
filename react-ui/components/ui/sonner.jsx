import { Toaster as Sonner } from 'sonner';

const Toaster = ({ theme = 'light', ...props }) => {
  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      offset={{ bottom: 'var(--pfa-sonner-bottom)' }}
      mobileOffset={{ bottom: 'var(--pfa-sonner-bottom)' }}
      visibleToasts={1}
      expand={false}
      className="toaster group pfa-sonner"
      style={
        {
          '--normal-bg': 'var(--tip-bg)',
          '--normal-text': 'var(--tip-fg)',
          '--normal-border': 'var(--edge)',
          '--border-radius': '12px',
        }
      }
      toastOptions={{ className: 'pfa-sonner-toast', classNames: { actionButton: 'pfa-sonner-action' } }}
      {...props}
    />
  );
};

export { Toaster };
