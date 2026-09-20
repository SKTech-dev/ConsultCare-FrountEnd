import React, { useState } from 'react';
import { Plus, Edit, Settings, Search, Filter, ChevronDown } from 'lucide-react';

const DestinationManager = () => {
  // Mock data for the destinations
  const [destinations, setDestinations] = useState([
    { id: 1, name: 'Giza, Egypt', sub: '(Pyramids View)', bookings: 120, img: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=400&q=80' },
    { id: 2, name: 'Kyoto, Japan', sub: '(Cherry Blossoms)', sales: '$5,000', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80' },
    { id: 3, name: 'Serengeti, Tanzania', sub: '(Safari Lodge)', sales: '$5,000', img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=400&q=80' },
    // Add more as needed to fill the grid
  ]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans text-[#181E4B]">
      {/* --- Navigation --- */}
      <nav className="flex items-center justify-between px-12 py-6 bg-transparent">
        <div className="text-2xl font-bold">Travello<span className="text-orange-400">.</span></div>
        <div className="hidden md:flex space-x-8 items-center font-medium">
          <a href="#">Company</a>
          <a href="#">Support</a>
          <a href="#">Settings</a>
          <div className="flex items-center space-x-2 border-l pl-8">
            <span>Profile</span>
            <div className="w-8 h-8 bg-orange-200 rounded-full overflow-hidden border border-orange-300">
              <img src="https://i.pravatar.cc/100" alt="user" />
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </nav>

      <div className="flex px-8 lg:px-12 py-8 gap-8">
        {/* --- Sidebar (Iconic) --- */}
        <aside className="hidden lg:flex flex-col space-y-10 py-4">
          <div className="p-2 text-gray-400 hover:text-orange-500 cursor-pointer"><Settings /></div>
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl cursor-pointer"><Plus /></div>
          {/* Add more sidebar icons here */}
        </aside>

        {/* --- Main Content --- */}
        <main className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
            <div>
              <h1 className="text-5xl font-serif font-bold text-[#1E1D4C] mb-2">
                Destination Management
              </h1>
              <p className="text-gray-500 italic">for [Company Name]</p>
            </div>
            
            <button className="mt-4 md:mt-0 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-3 rounded-xl shadow-lg shadow-orange-200 font-bold hover:scale-105 transition-transform flex items-center gap-2">
              <Plus size={20} /> ADD NEW DESTINATION
            </button>
          </div>

          {/* --- Filters Area --- */}
          <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 mb-8">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-orange-200 outline-none" />
            </div>
            <select className="bg-gray-50 border-none rounded-lg px-4 py-2 outline-none text-gray-600">
              <option>Filter by region</option>
            </select>
            <select className="bg-gray-50 border-none rounded-lg px-4 py-2 outline-none text-gray-600">
              <option>Sort by performance</option>
            </select>
          </div>

          {/* --- Grid --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {destinations.concat(destinations).map((item, idx) => (
              <div key={idx} className="bg-white rounded-[2.5rem] overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100 p-4">
                <img src={item.img} alt={item.name} className="w-full h-56 object-cover rounded-[1.8rem] mb-4" />
                <div className="px-2">
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{item.sub}</p>
                  <p className="text-sm font-semibold mb-6">
                    {item.bookings ? `Active Bookings: ${item.bookings}` : `Total Sales: ${item.sales}`}
                  </p>
                  
                  <div className="flex gap-3 pb-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg hover:bg-gray-50 transition-colors font-medium">
                      <Edit size={16} /> Edit
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg hover:bg-gray-50 transition-colors font-medium">
                      <Settings size={16} /> Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DestinationManager;