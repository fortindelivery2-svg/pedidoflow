import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-[var(--layout-bg)] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-[var(--layout-bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
