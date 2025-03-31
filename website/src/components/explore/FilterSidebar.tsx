export type FilterType = 'all' | 'featured' | 'trending';

interface FilterSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

const FilterSidebar = ({ isOpen, onClose, currentFilter, onFilterChange }: FilterSidebarProps) => {
    return (
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <div
                className={`fixed right-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold">Filter</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <button
                            onClick={() => {
                                onFilterChange('all');
                                onClose();
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg ${currentFilter === 'all'
                                ? 'bg-purple-500 text-white'
                                : 'hover:bg-gray-100'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => {
                                onFilterChange('featured');
                                onClose();
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg ${currentFilter === 'featured'
                                ? 'bg-purple-500 text-white'
                                : 'hover:bg-gray-100'
                                }`}
                        >
                            Featured
                        </button>
                        <button
                            onClick={() => {
                                onFilterChange('trending');
                                onClose();
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg ${currentFilter === 'trending'
                                ? 'bg-purple-500 text-white'
                                : 'hover:bg-gray-100'
                                }`}
                        >
                            Trending
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterSidebar; 