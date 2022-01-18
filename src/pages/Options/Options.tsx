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
    const [loading, setLoading] = useState(false);
    const [loadingValue, setLoadingValue] = useState(0);
    const [loadingMax, setLoadingMax] = useState(0);
    const [viewlist, setViewlist] = useState(false);

    if (!chrome.runtime.onMessage.hasListeners()) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.method === 'loading_list' || request.method === 'loading_group_shelf' || request.method === 'loading_genre') {
                loadBooks(request.data);
            }
            return true;
        });
    }

    function updateTerms(e: React.FormEvent<HTMLInputElement>, positive: boolean) {
        let terms = positive ? document.querySelectorAll("#crPositiveSearchTerms .crTermsContainer"):
                    document.querySelectorAll("#crNegativeSearchTerms .crTermsContainer");

        const values = Array.from(terms).map((search) => {
            console.log(search)
            return {
                term: (search.querySelector("[name=term]") as HTMLInputElement)?.value,
                exclude: {
                    before: (search.querySelector("[name=excludeBefore]") as HTMLInputElement)?.value?.split(",").map(x => x.trim()),
                    after: (search.querySelector("[name=excludeAfter]") as HTMLInputElement)?.value?.split(",").map(x => x.trim())
                }
            }
        }).filter(x => x.term).concat([{ term: '', exclude: { before: [], after: [] }}]);
        setSettings({...settings, [positive ? 'POSITIVE_SEARCH_TERMS' : 'NEGATIVE_SEARCH_TERMS']: values })
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

    function loadGenre() {
        setLoading(true);
        chrome.runtime.sendMessage({ method: 'get_genre', data: shelves }, response => {
            setLoading(false);
            if (response.cache) {
                loadBooks(response.data);
            }
        });
    }

    function loadGroupShelf() {
        setLoading(true);
        chrome.runtime.sendMessage({ method: 'get_group_shelf', data: shelves }, (response) => {
            setLoading(false);
            if (response.cache) {
                loadBooks(response.data);
            }
        });
    }

    function loadList() {
        setLoading(true);
        chrome.runtime.sendMessage({ method: 'get_list', data: shelves }, response => {
            setLoading(false);
            if (response.cache) {
                loadBooks(response.data);
            }
        });
    }

    function loadBooks(response : any) {
        setLoadingMax(response.total);
        setLoadingValue(response.current);
        setSettings((settings: any) => ({...settings, 'CLEAN_BOOKS': settings.CLEAN_BOOKS.concat(response.books)
            .filter((x: any, i : number, arr : Array<any>) => x && arr.findIndex(y => y.id === x.id) === i).sort((a: any, b: any) => a.title.localeCompare(b.title)) }));
    }

    function removeBook(id: string) {
        setSettings((settings: any) => ({...settings, 'CLEAN_BOOKS': settings.CLEAN_BOOKS.filter((x: any) => x.id !== id)}));
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
                    loadBooks({ books });
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
        <div className='OptionsContainer' onScroll={(e) => console.log(e)}>
            <div>
                <h1>{title} Page</h1>
                
                <div>
                    <button className='cr-button' onClick={resetSettings}>Reset Settings</button>
                    <button className='cr-button' onClick={clearCache}>Clear Book Cache</button>
                </div>
                <h2>Clean Book List:</h2>
                <div>
                    <input name='groupShelf' type='text' value={shelves} onChange={(e) => setShelves(e.target.value)} />
                    <button className='cr-button' onClick={loadGenre} disabled={loading}>Load Genre</button>
                    <button className='cr-button' onClick={loadList} disabled={loading}>Load List</button>
                    <button className='cr-button' onClick={loadGroupShelf} disabled={loading}>Load Group Shelf</button>
                </div>
                {
                    loading ?
                    <progress value={loadingValue} max={loadingMax}></progress> : <></>
                }
                
                <p><i>Genre can only load first 50 books if guest or first 1250 books if signed in.</i></p>
                <p><b>Loaded books: </b>{settings.CLEAN_BOOKS.length}</p>
                <div>
                    <Files onChange={importCleanBooks} multiple accepts={['.json']}><button className='cr-button'>Import List</button></Files>
                    <button className='cr-button' onClick={() => setViewlist(!viewlist)}>{viewlist ? 'Hide List' : 'View List'}</button>
                    <a className='cr-button' download='cleanreads.json' href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(settings.CLEAN_BOOKS))}`}>Download List</a>
                    <button className='cr-button' onClick={resetCleanBooks}>Empty List</button>
                </div>
                <div id='crCleanBookList'>
                    {viewlist && settings.CLEAN_BOOKS.map((x: any) => {
                        return (
                            <div className='crBook' key={x.id} title={x.title}>
                                <button className='remove' onClick={() => removeBook(x.id)}>X</button>
                                <a href={`https://www.goodreads.com/book/show/${x.id}`} target='_blank'>
                                    <img alt={x.title} src={x.cover.match('_.jpg') ? x.cover.replace(/(\_SX\d+\_?)?(\_SY\d+\_)?\.jpg/, '_SY150_.jpg') : x.cover} width='100' />
                                </a>
                            </div>
                        )
                    })}
                </div>
                <h2>Search Terms:</h2>
                <table>
                    <tbody id='crPositiveSearchTerms'>
                        <tr>
                            <th colSpan={3}>Positive Search Terms:</th>
                        </tr>
                        <tr>
                            <th>Ignore Before</th>
                            <th>Search Term</th>
                            <th>Ignore After</th>
                        </tr>
                        {settings.POSITIVE_SEARCH_TERMS.map((x: any, index: number) => {
                            return (
                                <tr className='crTermsContainer' key={index}>
                                    <td><input name='excludeBefore' value={x.exclude.before.join(', ')} type='text' onChange={(e) => updateTerms(e, true)} /></td>
                                    <td><input name='term' value={x.term} type='text' onChange={(e) => updateTerms(e, true)} /></td>
                                    <td><input name='excludeAfter' value={x.exclude.after.join(', ')} type='text' onChange={(e) => updateTerms(e, true)} /></td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tbody id='crNegativeSearchTerms'>
                        <tr>
                            <th colSpan={3}>Negative Search Terms:</th>
                        </tr>
                        <tr>
                            <th>Ignore Before</th>
                            <th>Search Term</th>
                            <th>Ignore After</th>
                        </tr>
                        {settings.NEGATIVE_SEARCH_TERMS.map((x: any, index: number) => {
                            return (
                                <tr className='crTermsContainer' key={index}>
                                    <td><input name='excludeBefore' value={x.exclude.before.join(', ')} type='text' onChange={(e) => updateTerms(e, false)} /></td>
                                    <td><input name='term' value={x.term} type='text' onChange={(e) => updateTerms(e, false)} /></td>
                                    <td><input name='excludeAfter' value={x.exclude.after.join(', ')} type='text' onChange={(e) => updateTerms(e, false)} /></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                <h2>Snippet length:</h2>
                <input type='number' value={settings.SNIPPET_HALF_LENGTH} min='0' onChange={(e) => setSettings({...settings, SNIPPET_HALF_LENGTH: parseInt(e.target.value) })} />
            </div>
        </div>
    );
};

export default Options;
