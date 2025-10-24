"use client";

import { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

interface DataTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  body?: (rowData: any) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface DataTableComponentProps {
  data?: any[];
  columns?: DataTableColumn[];
  onEdit?: (rowData: any) => void;
  onDelete?: (rowData: any) => void;
  onAdd?: () => void;
  title?: string;
  searchPlaceholder?: string;
  addButtonLabel?: string;
  showAddButton?: boolean;
}

export default function DataTableComponent({ 
  data = [], 
  columns = [],
  onEdit,
  onDelete,
  onAdd,
  title = "Data Table",
  searchPlaceholder = "Search...",
  addButtonLabel = "Add New",
  showAddButton = true
}: DataTableComponentProps) {
  const [globalFilter, setGlobalFilter] = useState('');

  // Template สำหรับ status badge
  const statusBodyTemplate = (rowData: any) => {
    const statusColors = {
      'In Stock': 'tw-bg-green-100 tw-text-green-800',
      'Low Stock': 'tw-bg-yellow-100 tw-text-yellow-800',
      'Out of Stock': 'tw-bg-red-100 tw-text-red-800',
      'Active': 'tw-bg-green-100 tw-text-green-800',
      'Inactive': 'tw-bg-gray-100 tw-text-gray-800',
      'Pending': 'tw-bg-yellow-100 tw-text-yellow-800',
      'Confirmed': 'tw-bg-green-100 tw-text-green-800',
      'Cancelled': 'tw-bg-red-100 tw-text-red-800',
      'Completed': 'tw-bg-blue-100 tw-text-blue-800'
    };

    return (
      <span className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-semibold ${statusColors[rowData.status as keyof typeof statusColors] || 'tw-bg-gray-100 tw-text-gray-800'}`}>
        {rowData.status}
      </span>
    );
  };

  // Template สำหรับ price/currency
  const priceBodyTemplate = (rowData: any, field: string) => {
    return <span className="tw-font-semibold tw-text-gray-700">฿{rowData[field]?.toLocaleString()}</span>;
  };

  // Template สำหรับ actions
  const actionBodyTemplate = (rowData: any) => {
    return (
      <div className="tw-flex tw-gap-2">
        {onEdit && (
          <Button
            icon="pi pi-pencil"
            className="p-button-rounded p-button-text p-button-sm tw-text-blue-600 hover:tw-bg-blue-50"
            onClick={() => onEdit(rowData)}
            tooltip="Edit"
          />
        )}
        {onDelete && (
          <Button
            icon="pi pi-trash"
            className="p-button-rounded p-button-text p-button-sm tw-text-red-600 hover:tw-bg-red-50"
            onClick={() => onDelete(rowData)}
            tooltip="Delete"
          />
        )}
      </div>
    );
  };

  // Header ของตาราง
  const header = (
    <div className="tw-flex tw-flex-wrap tw-gap-3 tw-items-center tw-justify-between tw-mb-4">
      <h2 className="tw-text-2xl tw-font-bold tw-text-gray-800">{title}</h2>
      <div className="tw-flex tw-gap-2 tw-items-center">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="tw-pl-10"
          />
        </span>
        {showAddButton && onAdd && (
          <Button
            label={addButtonLabel}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={onAdd}
          />
        )}
      </div>
    </div>
  );

  // สร้าง columns จากข้อมูล
  const renderColumns = () => {
    if (columns.length > 0) {
      const columnsToRender = [...columns];
      
      // เพิ่ม actions column ถ้ามี onEdit หรือ onDelete
      if (onEdit || onDelete) {
        columnsToRender.push({
          field: 'actions',
          header: 'Actions',
          sortable: false,
          body: actionBodyTemplate,
          className: 'tw-text-center',
          style: { width: '120px' }
        });
      }

      return columnsToRender.map((col) => (
        <Column
          key={col.field}
          field={col.field}
          header={col.header}
          sortable={col.sortable !== false}
          body={col.body}
          className={col.className}
          style={col.style}
        />
      ));
    }

    // ถ้าไม่มี columns ที่กำหนด ให้สร้างจาก data keys
    if (data.length > 0) {
      const dataColumns = Object.keys(data[0]).map((key) => (
        <Column
          key={key}
          field={key}
          header={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
          sortable
          className="tw-font-medium"
        />
      ));

      // เพิ่ม actions column
      if (onEdit || onDelete) {
        dataColumns.push(
          <Column
            key="actions"
            header="Actions"
            body={actionBodyTemplate}
            className="tw-text-center"
            style={{ width: '120px' }}
          />
        );
      }

      return dataColumns;
    }

    return null;
  };

  return (
    <div className="tw-p-8 tw-bg-gray-50 tw-min-h-screen">
      <div className="tw-max-w-7xl tw-mx-auto">
        <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-p-6">
          {header}
          <DataTable
            value={data}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            globalFilter={globalFilter}
            emptyMessage="No data available"
            className="tw-w-full"
            stripedRows
            showGridlines
            responsiveLayout="scroll"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
          >
            {renderColumns()}
          </DataTable>
        </div>
      </div>
    </div>
  );
}