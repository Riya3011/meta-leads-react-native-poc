import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useEffect, useState } from 'react';

type Lead = {
  id: string;
  created_time?: string;
  field_data?: {
    name: string;
    values: string[];
  }[];
};

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // IMPORTANT:
    // Replace this IP with your Mac's LAN IP.
    // The same IP Expo is using to connect to your iPhone.
    const ws = new WebSocket('ws://192.168.6.202:3000');

    ws.onopen = () => {
      console.log('Connected to backend');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'NEW_LEAD') {
          setLeads((currentLeads) => [
            message.lead,
            ...currentLeads,
          ]);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.log('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const renderLead = ({ item }: { item: Lead }) => (
    <View style={styles.leadCard}>
      <Text style={styles.leadTitle}>New Lead</Text>

      {item.field_data?.map((field) => (
        <View key={field.name} style={styles.field}>
          <Text style={styles.fieldName}>
            {field.name}
          </Text>

          <Text style={styles.fieldValue}>
            {field.values?.join(', ')}
          </Text>
        </View>
      ))}

      <Text style={styles.leadId}>
        Lead ID: {item.id}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Meta Lead Ads</Text>

        <View style={styles.connectionRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: connected
                  ? '#22C55E'
                  : '#EF4444',
              },
            ]}
          />

          <Text style={styles.connectionText}>
            {connected ? 'Live' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>
          Incoming Leads
        </Text>

        {leads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Waiting for leads...
            </Text>

            <Text style={styles.emptyText}>
              Submit a test lead through Meta's Lead
              Testing Tool and it will appear here
              automatically.
            </Text>
          </View>
        ) : (
          <FlatList
            data={leads}
            keyExtractor={(item) => item.id}
            renderItem={renderLead}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1877F2',
  },

  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },

  connectionText: {
    fontSize: 14,
    color: '#667085',
  },

  content: {
    flex: 1,
    padding: 24,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 16,
  },

  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
  },

  emptyText: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },

  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },

  leadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1877F2',
    marginBottom: 14,
  },

  field: {
    marginBottom: 10,
  },

  fieldName: {
    fontSize: 12,
    color: '#667085',
    textTransform: 'uppercase',
  },

  fieldValue: {
    fontSize: 16,
    color: '#101828',
    marginTop: 2,
  },

  leadId: {
    fontSize: 11,
    color: '#98A2B3',
    marginTop: 8,
  },
});