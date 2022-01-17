import React from 'react';
import { useSettings, INITIAL_SETTINGS } from '../Common/cleanreads';
import './Options.css';

interface Props {
    title: string;
}


const Options: React.FC<Props> = ({title} : Props) => {
    const [settings, setSettings, isPersistent, error] = useSettings();

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
        settings[positive ? 'POSITIVE_SEARCH_TERMS' : 'NEGATIVE_SEARCH_TERMS'].pop();
        setSettings({...settings})
    }

    function clearCache() {
        const settingsCopy = {...settings};
        chrome.storage.local.clear(() => {
            setSettings(settingsCopy);
            window.location.reload()
        });
    }

    return (
        <div className='OptionsContainer'>
            <div>
                {title} Page
                <div>
                    <button className='cr-button' onClick={() => addTerm(true)}>Add Positive</button>
                    <button className='cr-button' onClick={() => addTerm(false)}>Add Negative</button>
                    <button className='cr-button' onClick={() => removeTerm(true)}>Remove Positive</button>
                    <button className='cr-button' onClick={() => removeTerm(false)}>Remove Negative</button>
                </div>
                <div>
                    <button className='cr-button' onClick={() => setSettings({...INITIAL_SETTINGS})}>Reset Settings</button>
                    <button className='cr-button' onClick={() => clearCache()}>Clear Book Cache</button>
                </div>
                <p>Positive Search Terms:</p>
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
                <p>Negative Search Terms:</p>
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
                <p>Snippet length:</p>
                <input type='number' value={settings.SNIPPET_HALF_LENGTH} min='0' onChange={(e) => setSettings({...settings, SNIPPET_HALF_LENGTH: e.target.value })} />
            </div>
        </div>
    );
};

export default Options;
