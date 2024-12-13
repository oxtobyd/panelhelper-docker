import React from 'react';
import { Modal } from '../common/Modal';

interface Adviser {
    id: number;
    name: string;
    missing_fields: string[];
}

interface AdviserDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    advisers: Adviser[];
}

export const AdviserDetailsModal: React.FC<AdviserDetailsModalProps> = ({
    isOpen,
    onClose,
    title,
    advisers = []
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="max-h-96 overflow-y-auto">
                {advisers.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                        No advisers found
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Missing Fields
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {advisers.map((adviser) => (
                                <tr key={adviser.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {adviser.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <ul className="list-disc list-inside">
                                            {adviser.missing_fields.map((field, index) => (
                                                <li key={index}>{field}</li>
                                            ))}
                                        </ul>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Modal>
    );
};
