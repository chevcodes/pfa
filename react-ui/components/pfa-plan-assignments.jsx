import * as React from 'react';
import { Input } from './ui/input.jsx';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select.jsx';

function AssignmentSelect({ value, options, id, label, placeholder, focusId, className, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className} aria-label={label} autoFocus={id === focusId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function PfaPlanAssignments({ groups, questions, expanded, filter, focusId, classes, onFilter, onExpand, onAssign }) {
  const [search, setSearch] = React.useState(filter);
  const needle = search.trim().toLowerCase();
  const unresolved = new Set(questions);
  const assignedGroups = groups.map((group) => ({ ...group, categories: group.categories.filter((name) => !unresolved.has(name)) }));
  const visibleQuestions = questions.filter((name) => !needle || name.toLowerCase().includes(needle));
  const visibleGroups = assignedGroups.map((group) => ({
    ...group,
    visibleCategories: group.categories.filter((name) => !needle || name.toLowerCase().includes(needle)),
  }));
  const matchingCategories = visibleQuestions.length + visibleGroups.reduce((sum, group) => sum + group.visibleCategories.length, 0);

  return (
    <>
      <p className={classes.summary}>
        {questions.length ? `${assignedGroups.reduce((sum, group) => sum + group.categories.length, 0)} categories sorted, ${questions.length} still to place.` : `All ${assignedGroups.reduce((sum, group) => sum + group.categories.length, 0)} categories are sorted.`}
      </p>
      {questions.length ? (
        <div className={`${classes.group} ${classes.urgent}`}>
          <h5 className={classes.heading}>Still to place</h5>
          {visibleQuestions.map((name) => {
            const id = `place-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
            return (
              <div className={classes.row} key={name}>
                <label className={classes.name} htmlFor={id}>{name}</label>
                <AssignmentSelect id={id} label={`Group for ${name}`} value="" options={groups} placeholder="Choose…" focusId={focusId} className={classes.select} onChange={(key) => onAssign(name, key, id, true)} />
              </div>
            );
          })}
        </div>
      ) : null}
      <button type="button" className={classes.more} onClick={onExpand}>
        {expanded ? 'Hide the full list' : `Change any of the ${assignedGroups.reduce((sum, group) => sum + group.categories.length, 0)}`}
      </button>
      <div className={classes.full} hidden={!expanded}>
        <Input type="search" className={classes.filter} placeholder="Find a category" aria-label="Filter categories" value={search} onChange={(event) => { setSearch(event.target.value); onFilter(event.target.value); }} />
        {visibleGroups.map((group) => group.visibleCategories.length || !needle ? (
          <div className={classes.group} id={`plan-band-${group.key}`} tabIndex={-1} key={group.key}>
            <h5 className={classes.heading}>
              <i className={`${classes.key} is-${group.key}`} aria-hidden="true" />
              <span>{group.label}</span>
              <span className={classes.count}>{group.categories.length}</span>
            </h5>
            {group.visibleCategories.map((name) => {
              const id = `assign-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
              return (
                <div className={classes.row} key={name}>
                  <label className={classes.name} htmlFor={id}>{name}</label>
                  <AssignmentSelect id={id} label={`Group for ${name}`} value={group.key} options={groups} focusId={focusId} className={classes.select} onChange={(key) => onAssign(name, key, id, false)} />
                </div>
              );
            })}
            {!group.categories.length ? <p className={classes.empty}>No categories here yet. Use any category's group menu to add one.</p> : null}
          </div>
        ) : null)}
        {matchingCategories ? null : <p className={classes.empty}>No category matches that.</p>}
      </div>
    </>
  );
}
