#!/usr/bin/env bash
echo "This script synchronises local User Service alert policy and condition definitions with those defined in New Relic"
echo "You will need NR_API_KEY set with the User Service API key in env vars"
echo 'Select environment to perform sync in: '
options=("Alpha" "Prod" "Quit")
select opt in "${options[@]}"
do
    case $opt in
        "Alpha")
            echo "Setting environment to Alpha for sync"
            env="Alpha"
            break
            ;;
        "Prod")
            echo "Setting environment to Prod for sync"
            env="Prod"
            break
            ;;
        "Quit")
            break
            ;;
        *) echo "invalid option $REPLY";;
    esac
done

read -p "Do you wish to perform the sync (y/n)?" choice
if [[ $choice =~ ^(y| ) ]] || [[ -z $choice ]]; then
    ts-node src/main.ts --env "$env"
fi