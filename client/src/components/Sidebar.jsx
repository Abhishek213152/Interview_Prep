import React from "react";
import Upload from "./Upload";

const Sidebar = () => {
  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-gray-900 to-blue-900 text-white fixed h-full p-6 shadow-lg">
        <h2 className="text-2xl font-extrabold tracking-wider">Krek-It</h2>
        <ul className="mt-6 space-y-4">
          <li className="hover:bg-blue-700 p-3 rounded-lg cursor-pointer transition duration-300 text-gray-300 hover:text-white">
            ATS Score
          </li>
          <li className="hover:bg-blue-700 p-3 rounded-lg cursor-pointer transition duration-300 text-gray-300 hover:text-white">
            Mock Test
          </li>
          <li className="hover:bg-blue-700 p-3 rounded-lg cursor-pointer transition duration-300 text-gray-300 hover:text-white">
            Practise Coding
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 h-screen overflow-auto">
        {/* Header */}
        <header className="bg-gray-800 text-white p-5 fixed w-full left-64 shadow-md flex items-center justify-between">
          <h1 className="text-lg font-bold">Upload</h1>
        </header>

        {/* Content Section */}
        <main className="p-6 mt-20">
          <Upload />
        </main>
      </div>
    </div>
  );
};

export default Sidebar;
