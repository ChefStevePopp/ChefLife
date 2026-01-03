import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { TeamManagement } from '../components/TeamManagement';
import { MyProfile } from '../components/MyProfile';

export const TeamRoutes = () => {
  return (
    <Routes>
      <Route index element={<TeamManagement />} />
      <Route path="my-profile" element={<MyProfile />} />
    </Routes>
  );
};

export default TeamRoutes;
