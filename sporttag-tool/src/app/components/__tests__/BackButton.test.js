/**
 * @jest-environment jsdom
 */

/**
 * Was alles getestet wird:
 * rendert den zurück-Knopf, 
 * callt router.back() wenn der zurück-Knopf gedrückt wird, 
 * zeigt den export-Knopf nicht wenn man nicht die Rolle Lehrer hat, 
 * zeigt den export-Knopf wenn man die Rolle Lehrer hat, 
 * zeigt export popup wenn man den export-Knopf klickt
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BackButton from '@/app/components/BackButton';
import { useRouter } from 'next/navigation';

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock ExportPopup
jest.mock('@/app/components/ExportPopup', () => {
  const ExportPopup = ({ onClose }) => (
      <div data-testid="export-popup">
        ExportPopup <button onClick={onClose}>Close</button>
      </div>
  );
  ExportPopup.displayName = "MockExportPopup";
  return ExportPopup;
});


// Mock fetch
global.fetch = jest.fn();

describe('BackButton', () => {
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ back: mockBack, push: jest.fn() });
  });

  test('renders the back button', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'schueler' }),
    });

    render(<BackButton />);
    expect(await screen.findByText('Zurück')).toBeInTheDocument();
  });

  test('calls router.back() when clicking the back button', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'schueler' }),
    });

    render(<BackButton />);
    const button = await screen.findByText('Zurück');
    fireEvent.click(button);
    expect(mockBack).toHaveBeenCalled();
  });

  test('does not show export button if role is not lehrer', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'schueler' }),
    });

    render(<BackButton />);
    await waitFor(() => {
      expect(screen.queryByText('Exportieren')).not.toBeInTheDocument();
    });
  });

  test('shows export button if role is lehrer', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'teacher' }),
    });

    render(<BackButton />);
    expect(await screen.findByText('Exportieren')).toBeInTheDocument();
  });

  test('shows export popup on export button click', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'teacher' }),
    });

    render(<BackButton />);
    const exportBtn = await screen.findByText('Exportieren');
    fireEvent.click(exportBtn);
    expect(await screen.findByTestId('export-popup')).toBeInTheDocument();
  });
});
