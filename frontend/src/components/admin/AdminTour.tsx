import React, { useState, useEffect } from 'react';
import { Joyride, STATUS, type Step, type EventData } from 'react-joyride';

export const AdminTour: React.FC = () => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('adminTourCompleted');
    if (!hasSeenTour) {
      // Delay the start slightly so the DOM elements are fully mounted
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: 'Welcome to the Admin Dashboard!',
      content: "Let's take a quick tour of your administrative tools.",
    },
    {
      target: '#tour-step-create',
      title: 'Design Session',
      content: 'Here you can create new coding assessments, add multiple choice questions, and configure your test environment.',
      placement: 'right',
    },
    {
      target: '#tour-step-overview',
      title: 'Active Sessions',
      content: 'Monitor live candidates in real-time, open waiting rooms, and manage ongoing test sessions.',
      placement: 'right',
    },
    {
      target: '#tour-step-system',
      title: 'System Metrics',
      content: 'View real-time infrastructure health, server load, and database performance.',
      placement: 'right',
    },
    {
      target: '#tour-step-theme',
      title: 'Dark Mode',
      content: 'Toggle between light and dark themes for a comfortable viewing experience.',
      placement: 'top',
    },
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('adminTourCompleted', 'true');
    }
  };

  return (
    <Joyride
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      scrollToFirstStep
      steps={steps}
      options={{
        arrowColor: 'var(--background)',
        backgroundColor: 'var(--background)',
        buttons: ['back', 'skip', 'primary'],
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        primaryColor: '#7c3aed',
        textColor: 'var(--foreground)',
        zIndex: 1000,
      }}
      styles={{
        arrow: {
          color: 'var(--background)',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        },
        tooltip: {
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
          borderRadius: '0.375rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid var(--border)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonPrimary: {
          backgroundColor: '#7c3aed',
          borderRadius: '0.25rem',
          fontSize: '12px',
          padding: '8px 16px',
        },
        buttonBack: {
          marginRight: 10,
          color: 'var(--muted-foreground)',
          fontSize: '12px',
        },
        buttonSkip: {
          color: 'var(--muted-foreground)',
          fontSize: '12px',
        }
      }}
    />
  );
};
