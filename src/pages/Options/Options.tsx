import React, { useState } from 'react';
import { useSettings, INITIAL_SETTINGS } from '../Common/cleanreads';
import './Options.css';
import Files from 'react-files';

interface Props {
    title: string;
}


const Options: React.FC<Props> = ({title} : Props) => {
    const [settings, setSettings, isPersistent, error] = useSettings();
    const [shelves, setShelves] = useState('');
    const [loadingShelf, setLoadingShelf] = useState(false);

    function updateTerms(e: React.FormEvent<HTMLInputElement>, positive: boolean) {
        let terms = positive ? document.querySelectorAll("#crPositiveSearchTerms > .crTermsContainer"):
                    document.querySelectorAll("#crNegativeSearchTerms > .crTermsContainer");

        const values = Array.from(terms).map((search) => {
            console.log(search)
            return {
                term: (search.querySelector("[name=term]") as HTMLInputElement)?.value,
                exclude: {
                    before: (search.querySelector("[name=excludeBefore]") as HTMLInputElement)?.value?.split(",").map(x => x.trim()),
                    after: (search.querySelector("[name=excludeAfter]") as HTMLInputElement)?.value?.split(",").map(x => x.trim())
                }
            }
        }).filter(x => x.term);
        setSettings({...settings, [positive ? 'POSITIVE_SEARCH_TERMS' : 'NEGATIVE_SEARCH_TERMS']: values })
    }

    function addTerm(positive: boolean) {
        settings[positive ? 'POSITIVE_SEARCH_TERMS' : 'NEGATIVE_SEARCH_TERMS'].push({ term: '', exclude: { before: [], after: [] }});
        setSettings({...settings})
    }

    function removeTerm(positive: boolean) {
        const copy = JSON.parse(JSON.stringify(settings));
        copy[positive ? 'POSITIVE_SEARCH_TERMS' : 'NEGATIVE_SEARCH_TERMS'].pop();
        setSettings({...copy})
    }

    function resetSettings() {
        const initialCopy = JSON.parse(JSON.stringify(INITIAL_SETTINGS));
        initialCopy.CLEAN_BOOKS = settings.CLEAN_BOOKS;
        setSettings({...initialCopy})
    }

    function clearCache() {
        const settingsCopy = {...settings};
        chrome.storage.local.clear(() => {
            setSettings(settingsCopy);
            window.location.reload()
        });
    }

    function loadGroupShelf() {
        setLoadingShelf(true);
        chrome.runtime.sendMessage({ method: 'get_group_shelf', data: shelves }, (response) => {
            const books = settings.CLEAN_BOOKS.concat(response.books).filter((x: any, i : number, arr : Array<any>) => x && arr.indexOf(x) === i);
            setSettings({...settings, 'CLEAN_BOOKS': books });
            setLoadingShelf(false);
        });
    }

    function loadList() {
        setLoadingShelf(true);
        chrome.runtime.sendMessage({ method: 'get_list', data: shelves }, (response) => {
            const books = settings.CLEAN_BOOKS.concat(response.books).filter((x: any, i : number, arr : Array<any>) => x && arr.indexOf(x) === i);
            setSettings({...settings, 'CLEAN_BOOKS': books });
            setLoadingShelf(false);
        })
    }

    function importCleanBooks(files : Array<File>) {
        let loaded = 0;
        let books : any = [];
        for (const file of files) {
            const fileReader = new FileReader();
            fileReader.onload = (event) => {
                books = books.concat(JSON.parse((event.target?.result as string)))
                loaded++;
                if (loaded == files.length) {
                    const list = settings.CLEAN_BOOKS.concat(books).filter((x: any, i : number, arr : Array<any>) => x && arr.indexOf(x) === i);
                    setSettings({...settings, 'CLEAN_BOOKS': list });
                }
            }
            fileReader.readAsText(file);
        }
    }

    function resetCleanBooks() {
        if (confirm('Are you sure you wish to empty clean books list? This cannot be undone.')) {
            setSettings({...settings, 'CLEAN_BOOKS': [] });
        }
    }

    return (
        <div className='OptionsContainer'>
            <div>
                <h1>{title} Page</h1>
                
                <div>
                    <button className='cr-button' onClick={resetSettings}>Reset Settings</button>
                    <button className='cr-button' onClick={clearCache}>Clear Book Cache</button>
                </div>
                <h2>Search Terms:</h2>
                <div>
                    <button className='cr-button' onClick={() => addTerm(true)}>Add Positive</button>
                    <button className='cr-button' onClick={() => addTerm(false)}>Add Negative</button>
                    <button className='cr-button' onClick={() => removeTerm(true)}>Remove Positive</button>
                    <button className='cr-button' onClick={() => removeTerm(false)}>Remove Negative</button>
                </div>
                <h4>Positive Search Terms:</h4>
                <div id="crPositiveSearchTerms">
                    {settings.POSITIVE_SEARCH_TERMS.map((x: any, index: number) => {
                        return (
                            <div className='crTermsContainer'>
                                <input name='excludeBefore' value={x.exclude.before.join(', ')} type='text' onChange={(e) => updateTerms(e, true)} />
                                <input name='term' value={x.term} type='text' onChange={(e) => updateTerms(e, true)} />
                                <input name='excludeAfter' value={x.exclude.after.join(', ')} type='text' onChange={(e) => updateTerms(e, true)} />
                            </div>
                        )
                    })}
                </div>
                <h4>Negative Search Terms:</h4>
                <div id="crNegativeSearchTerms">
                    {settings.NEGATIVE_SEARCH_TERMS.map((x: any, index: number) => {
                        return (
                            <div className='crTermsContainer'>
                                <input name='excludeBefore' value={x.exclude.before.join(', ')} type='text' onChange={(e) => updateTerms(e, false)} />
                                <input name='term' value={x.term} type='text' onChange={(e) => updateTerms(e, false)} />
                                <input name='excludeAfter' value={x.exclude.after.join(', ')} type='text' onChange={(e) => updateTerms(e, false)} />
                            </div>
                        )
                    })}
                </div>
                <h2>Clean Book List:</h2>
                <div>
                    <input name='groupShelf' type='text' value={shelves} onChange={(e) => setShelves(e.target.value)} />
                    <button className='cr-button' onClick={loadList} disabled={loadingShelf}>{loadingShelf ? 'Loading...' : 'Load List'}</button>
                    <button className='cr-button' onClick={loadGroupShelf} disabled={loadingShelf}>{loadingShelf ? 'Loading...' : 'Load Group Shelf'}</button>
                </div>
                <p><i>Recommended lists: <a href='https://www.goodreads.com/list/show/3674' target='_blank'>3674</a></i></p>
                <p><i>Recommended group shelves: <a href='https://www.goodreads.com/group/bookshelf/5989' target='_blank'>5989</a></i></p>
                <p><b>Loaded books: </b>{settings.CLEAN_BOOKS.length}</p>
                <div>
                    <Files onChange={importCleanBooks} multiple accepts={['.json']}><button className='cr-button'>Import List</button></Files>
                    <a className='cr-button' download='cleanreads.json' href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(settings.CLEAN_BOOKS))}`}>Download List</a>
                    <button className='cr-button' onClick={resetCleanBooks}>Empty List</button>
                </div>
                <h2>Snippet length:</h2>
                <input type='number' value={settings.SNIPPET_HALF_LENGTH} min='0' onChange={(e) => setSettings({...settings, SNIPPET_HALF_LENGTH: parseInt(e.target.value) })} />
            </div>
        </div>
    );
};

export default Options;
