import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { TeamManagement } from '../components/TeamManagement';
import { MyProfile } from '../components/MyProfile';
import { TeamPerformance } from '../components/TeamPerformance';

export const TeamRoutes = () => {
  return (
    <Routes>
      <Route index element={<TeamManagement />} />
      <Route path="my-profile" element={<MyProfile />} />
      <Route path="performance" element={<TeamPerformance />} />
    </Routes>
  );
};

export default TeamRoutes;
