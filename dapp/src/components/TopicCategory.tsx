type Props = {
    value: number | string;
    onChange: Function;
    disable?: boolean;
}

/**
 * Props:
 *  - value
 *  - onChange
 *  - disable
 */
function TopicCategory(props: Props) {

    function onCategoryCahange() {
        if (!evt.target.value) return;
        props.onChange({ target: { id: "category", value: evt.target.value } });
    }

    return(
        <select id="category" className="form-select px-3" value={props.value} onChange={onCategoryCahange} disabled={props.disable}>
            <option value="">Select...</option>
            <option value="0">Decision</option>
            <option value="1">Spent</option>
            <option value="2">Change quota</option>
            <option value="3">Change Manager</option>
        </select>
    )
}

export default TopicCategory;