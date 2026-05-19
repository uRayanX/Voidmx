#include <iostream>
#include <vector>
#include <cstdlib>
#include <ctime>
#include <iomanip>

using namespace std;

struct Process {
    int id, arrival, burst, completion, turnaround, response, firstRun, remaining, tickets;

    Process(int id, int arrival, int burst, int tickets)
        : id(id), arrival(arrival), burst(burst), tickets(tickets),
          completion(0), turnaround(0), response(0), firstRun(-1), remaining(burst) {}
};

void printResults(vector<Process>& procs) {
    cout << "\n========================================================================" << endl;
    cout << "                  LOTTERY SCHEDULING RESULTS                          " << endl;
    cout << "========================================================================" << endl;
    cout << " P  | Arrival | Burst | Completion | Turnaround | Response " << endl;
    cout << "----|---------|-------|------------|------------|----------" << endl;

    double avgTurnaround = 0, avgResponse = 0;
    for (auto& p : procs) {
        cout << " " << p.id << "  |    " << p.arrival << "    |   " << p.burst 
             << "   |     " << p.completion << "      |     " << p.turnaround 
             << "      |    " << p.response << "    " << endl;
        avgTurnaround += p.turnaround;
        avgResponse += p.response;
    }
    
    cout << "----|---------|-------|------------|------------|----------" << endl;
    cout << "Average Turnaround Time: " << fixed << setprecision(2) 
         << setw(6) << (avgTurnaround / procs.size()) 
         << "  |  Average Response Time: " << setw(6) 
         << (avgResponse / procs.size()) << endl;
    cout << "========================================================================" << endl;
}

void lottery(vector<Process>& procs, int quantum) {
    srand(42);
    int currentTime = 0, completed = 0;

    cout << "\n========================================================================" << endl;
    cout << "         LOTTERY SCHEDULING SIMULATION                                 " << endl;
    cout << "  Quantum: " << quantum << "  |  Processes: " << procs.size() 
         << "  |  Seed: 42                                " << endl;
    cout << "========================================================================\n" << endl;

    while (completed < procs.size()) {
        vector<int> eligible;
        int totalTickets = 0;

        for (int i = 0; i < procs.size(); i++) {
            if (procs[i].arrival <= currentTime && procs[i].remaining > 0) {
                eligible.push_back(i);
                totalTickets += procs[i].tickets;
            }
        }

        if (eligible.empty()) {
            currentTime++;
            continue;
        }

        int winningTicket = rand() % totalTickets;
        int counter = 0, winner = -1;
        
        for (int idx : eligible) {
            counter += procs[idx].tickets;
            if (winningTicket < counter) {
                winner = idx;
                break;
            }
        }

        int timeToRun = min(quantum, procs[winner].remaining);
        
        if (procs[winner].firstRun == -1) {
            procs[winner].firstRun = currentTime;
            procs[winner].response = procs[winner].firstRun - procs[winner].arrival;
        }

        // Print lottery round details
        cout << "+---------- ROUND " << (currentTime / 3 + 1) << " " << string(40, '-') << "+" << endl;
        cout << "| Time: " << setw(2) << (currentTime - timeToRun) << "-" << setw(2) << currentTime 
             << " | Winner: P" << procs[winner].id << " | Tickets: " << procs[winner].tickets 
             << "/" << totalTickets << " | Duration: " << timeToRun << "u" << endl;
        
        procs[winner].remaining -= timeToRun;
        currentTime += timeToRun;

        if (procs[winner].remaining == 0) {
            procs[winner].completion = currentTime;
            procs[winner].turnaround = procs[winner].completion - procs[winner].arrival;
            completed++;
            cout << "| [COMPLETED] P" << procs[winner].id << " finished at t=" << currentTime 
                 << string(30, ' ') << "|" << endl;
        } else {
            cout << "| [RUNNING] P" << procs[winner].id << " continues... (" << procs[winner].remaining 
                 << " units remaining)" << string(20, ' ') << "|" << endl;
        }
        cout << "+-------------------------------------------------------------+\n" << endl;
    }

    printResults(procs);
}

int main() {
    vector<Process> processes;
    processes.push_back(Process(1, 0, 8, 4));
    processes.push_back(Process(2, 1, 4, 2));
    processes.push_back(Process(3, 2, 9, 1));
    processes.push_back(Process(4, 3, 5, 3));

    lottery(processes, 3);
    return 0;
}