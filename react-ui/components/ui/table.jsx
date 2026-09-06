import * as React from 'react';

function Table({ className, ...props }) {
  return <table data-slot="table" className={className} {...props} />;
}

function TableHeader({ className, ...props }) {
  return <thead data-slot="table-header" className={className} {...props} />;
}

function TableBody({ className, ...props }) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

function TableRow({ className, ...props }) {
  return <tr data-slot="table-row" className={className} {...props} />;
}

function TableHead({ className, ...props }) {
  return <th data-slot="table-head" className={className} {...props} />;
}

function TableCell({ className, ...props }) {
  return <td data-slot="table-cell" className={className} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
